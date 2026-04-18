const { app, BrowserWindow, Tray, ipcMain, screen, nativeTheme } = require("electron");
const path = require("path");
const fs = require("fs");
const { execSync, exec } = require("child_process");
const os = require("os");

const TIMETRACK_DIR = path.join(os.homedir(), ".timetrack");
const SESSIONS_FILE = path.join(TIMETRACK_DIR, "sessions.json");
const PROJECTS_FILE = path.join(TIMETRACK_DIR, "projects.json");
const CONFIG_FILE = path.join(TIMETRACK_DIR, "config.json");
const TIMETRACK_SH = path.join(TIMETRACK_DIR, "timetrack.sh");

let tray = null;
let popoverWin = null;
let dashboardWin = null;
let dataWatcher = null;

// ── Data reading ─────────────────────────────────────────────
function readJSON(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf-8"));
  } catch {
    return null;
  }
}

function getSessions() {
  return readJSON(SESSIONS_FILE) || [];
}

function getProjects() {
  const data = readJSON(PROJECTS_FILE);
  return data?.projects || [];
}

function getActiveSession() {
  const sessions = getSessions();
  return sessions.find((s) => !s.stop) || null;
}

function getAllData() {
  return {
    sessions: getSessions(),
    projects: getProjects(),
    active: getActiveSession(),
  };
}

// ── Commands via timetrack.sh ────────────────────────────────
function runTimetrack(args) {
  try {
    return execSync(`bash "${TIMETRACK_SH}" ${args}`, {
      encoding: "utf-8",
      timeout: 10000,
    }).trim();
  } catch (err) {
    return err.message;
  }
}

// ── Tray title (shows elapsed time in menu bar) ──────────────
function updateTrayTitle() {
  if (!tray) return;
  const active = getActiveSession();
  if (active) {
    const start = new Date(active.start).getTime();
    const elapsed = Math.floor((Date.now() - start) / 1000);
    const h = Math.floor(elapsed / 3600);
    const m = Math.floor((elapsed % 3600) / 60);
    const s = elapsed % 60;
    const timeStr = h
      ? `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
      : `${m}:${String(s).padStart(2, "0")}`;
    tray.setTitle(` ${timeStr}`);
  } else {
    tray.setTitle("");
  }
}

// ── Popover window ───────────────────────────────────────────
function createPopover() {
  if (popoverWin) {
    popoverWin.show();
    popoverWin.focus();
    return;
  }

  const trayBounds = tray.getBounds();
  const display = screen.getDisplayNearestPoint({
    x: trayBounds.x,
    y: trayBounds.y,
  });

  const winW = 380;
  const winH = 560;
  const x = Math.round(
    trayBounds.x + trayBounds.width / 2 - winW / 2
  );
  const y = trayBounds.y + trayBounds.height + 4;

  popoverWin = new BrowserWindow({
    width: winW,
    height: winH,
    x: Math.min(x, display.workArea.x + display.workArea.width - winW),
    y,
    frame: false,
    resizable: false,
    movable: false,
    show: false,
    skipTaskbar: true,
    alwaysOnTop: true,
    transparent: true,
    vibrancy: "under-window",
    visualEffectState: "active",
    backgroundColor: "#00000000",
    hasShadow: true,
    roundedCorners: true,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  popoverWin.loadFile(path.join(__dirname, "renderer", "popover.html"));

  popoverWin.once("ready-to-show", () => popoverWin.show());

  popoverWin.on("blur", () => {
    if (popoverWin && !popoverWin.isDestroyed()) {
      popoverWin.hide();
    }
  });

  popoverWin.on("closed", () => {
    popoverWin = null;
  });
}

function togglePopover() {
  if (popoverWin && popoverWin.isVisible()) {
    popoverWin.hide();
  } else {
    createPopover();
  }
}

// ── Dashboard window ─────────────────────────────────────────
function createDashboard() {
  if (dashboardWin) {
    dashboardWin.show();
    dashboardWin.focus();
    return;
  }

  dashboardWin = new BrowserWindow({
    width: 960,
    height: 660,
    minWidth: 800,
    minHeight: 500,
    titleBarStyle: "hiddenInset",
    trafficLightPosition: { x: 14, y: 14 },
    vibrancy: "under-window",
    visualEffectState: "active",
    backgroundColor: "#00000000",
    transparent: true,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  dashboardWin.loadFile(path.join(__dirname, "renderer", "dashboard.html"));

  dashboardWin.on("closed", () => {
    dashboardWin = null;
  });
}

// ── File watching for live updates ───────────────────────────
function watchData() {
  const notify = () => {
    const data = getAllData();
    if (popoverWin && !popoverWin.isDestroyed()) {
      popoverWin.webContents.send("data-update", data);
    }
    if (dashboardWin && !dashboardWin.isDestroyed()) {
      dashboardWin.webContents.send("data-update", data);
    }
    updateTrayTitle();
  };

  // Watch sessions.json for changes
  if (fs.existsSync(SESSIONS_FILE)) {
    let debounce = null;
    dataWatcher = fs.watch(SESSIONS_FILE, () => {
      clearTimeout(debounce);
      debounce = setTimeout(notify, 300);
    });
  }

  // Also update tray title every second for live timer
  setInterval(() => {
    updateTrayTitle();
  }, 1000);

  // Push data to windows every 2 seconds (in case file watcher misses)
  setInterval(notify, 2000);
}

// ── IPC handlers ─────────────────────────────────────────────
function setupIPC() {
  ipcMain.handle("get-data", () => getAllData());

  ipcMain.handle("run-command", (_event, cmd) => {
    return runTimetrack(cmd);
  });

  ipcMain.handle("open-dashboard", () => {
    createDashboard();
  });

  ipcMain.handle("add-note", (_event, note) => {
    const sessions = getSessions();
    const active = sessions.find((s) => !s.stop);
    if (active) {
      active.notes = active.notes
        ? `${active.notes}\n${note}`
        : note;
      fs.writeFileSync(SESSIONS_FILE, JSON.stringify(sessions, null, 2));
    }
    return !!active;
  });

  ipcMain.handle("get-projects", () => getProjects());
}

// ── App lifecycle ────────────────────────────────────────────
app.whenReady().then(() => {
  console.log("[TT] App ready, creating tray...");

  // Force dark mode
  nativeTheme.themeSource = "dark";

  // Create tray with a proper nativeImage
  const { nativeImage } = require("electron");
  const iconPath = path.join(__dirname, "assets", "trayTemplate.png");
  let icon;
  if (fs.existsSync(iconPath)) {
    icon = nativeImage.createFromPath(iconPath);
    icon.setTemplateImage(true);
    console.log(`[TT] Loaded tray icon: ${icon.getSize().width}x${icon.getSize().height}, empty=${icon.isEmpty()}`);
  } else {
    // Fallback: 16x16 filled icon
    const buf = Buffer.alloc(16 * 16 * 4, 0);
    for (let i = 0; i < 16 * 16; i++) {
      buf[i * 4 + 3] = 200; // semi-opaque black
    }
    icon = nativeImage.createFromBuffer(buf, { width: 16, height: 16 });
    icon.setTemplateImage(true);
    console.log("[TT] Using fallback icon");
  }

  tray = new Tray(icon);
  tray.setToolTip("Claude Time Tracker");
  tray.setTitle(" ✦ idle");
  tray.on("click", togglePopover);

  console.log("[TT] Tray created successfully");

  updateTrayTitle();
  setupIPC();
  watchData();

  // Also hide dock icon (menu-bar-only app)
  app.dock?.hide();

  console.log("[TT] Initialization complete");
});

app.on("window-all-closed", (e) => {
  // Don't quit when windows close — stay in tray
  e.preventDefault?.();
});
