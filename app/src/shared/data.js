// Data layer — reads from Electron preload API and computes stats.

const PROJECT_COLORS = [
  "#F5A524", "#3B82F6", "#A78BFA", "#10B981", "#EF4444",
  "#06B6D4", "#EC4899", "#F97316", "#14B8A6", "#8B5CF6",
];

export function getProjectColor(index) {
  return PROJECT_COLORS[index % PROJECT_COLORS.length];
}

export function buildProjectMap(projects) {
  const map = {};
  projects.forEach((p, i) => {
    map[p.name] = {
      id: p.name,
      name: p.name,
      client: p.group || "—",
      color: getProjectColor(i),
      match: p.match,
      rate: p.rate,
    };
  });
  return map;
}

export function formatElapsed(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function formatHM(minutes) {
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  if (h && m) return `${h}h ${String(m).padStart(2, "0")}m`;
  if (h) return `${h}h`;
  return `${m}m`;
}

export function formatTime(date) {
  return date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

export function sessionDurationMinutes(session) {
  const start = new Date(session.start).getTime();
  const end = session.stop ? new Date(session.stop).getTime() : Date.now();
  return (end - start) / 60000;
}

export function isToday(dateStr) {
  const d = new Date(dateStr);
  const now = new Date();
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
}

export function isThisWeek(dateStr) {
  const d = new Date(dateStr);
  const now = new Date();
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay());
  startOfWeek.setHours(0, 0, 0, 0);
  return d >= startOfWeek;
}

export function isThisMonth(dateStr) {
  const d = new Date(dateStr);
  const now = new Date();
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
}

export function classifyActivity(session) {
  const total = (session.reads || 0) + (session.edits || 0) + (session.bash_calls || 0);
  if (total === 0) return "mixed";
  const editRatio = (session.edits || 0) / total;
  const readRatio = (session.reads || 0) / total;
  const bashRatio = (session.bash_calls || 0) / total;
  if (editRatio >= 0.3) return "deep_work";
  if (readRatio >= 0.8) return "investigation";
  if (bashRatio >= 0.4) return "tooling";
  return "mixed";
}

export function computeStats(sessions, filter = "today") {
  let filtered;
  if (filter === "today") filtered = sessions.filter((s) => isToday(s.start));
  else if (filter === "week") filtered = sessions.filter((s) => isThisWeek(s.start));
  else if (filter === "month") filtered = sessions.filter((s) => isThisMonth(s.start));
  else filtered = sessions;

  const totalMinutes = filtered.reduce((s, sess) => s + sessionDurationMinutes(sess), 0);

  // Deep work = sessions classified as deep_work
  const deepMinutes = filtered
    .filter((s) => classifyActivity(s) === "deep_work")
    .reduce((sum, s) => sum + sessionDurationMinutes(s), 0);

  // Context switches = number of project changes (adjacent sessions with different projects)
  let switches = 0;
  for (let i = 1; i < filtered.length; i++) {
    if (filtered[i].project !== filtered[i - 1].project) switches++;
  }

  // Focus score: ratio of deep work + penalty for too many switches
  const focusRaw = totalMinutes > 0
    ? Math.round((deepMinutes / totalMinutes) * 100 - switches * 2)
    : 0;
  const focusScore = Math.max(0, Math.min(100, focusRaw));

  // Categories
  const cats = { deep_work: 0, investigation: 0, tooling: 0, mixed: 0 };
  filtered.forEach((s) => {
    const cls = classifyActivity(s);
    cats[cls] += sessionDurationMinutes(s);
  });

  const catTotal = Object.values(cats).reduce((a, b) => a + b, 0) || 1;
  const categories = [
    { name: "Deep work", pct: Math.round((cats.deep_work / catTotal) * 100), color: "#3B82F6" },
    { name: "Investigation", pct: Math.round((cats.investigation / catTotal) * 100), color: "#A78BFA" },
    { name: "Tooling", pct: Math.round((cats.tooling / catTotal) * 100), color: "#F5A524" },
    { name: "Admin/Mixed", pct: Math.round((cats.mixed / catTotal) * 100), color: "#64748B" },
  ];

  // Per-project hours
  const projectHours = {};
  filtered.forEach((s) => {
    if (!projectHours[s.project]) projectHours[s.project] = 0;
    projectHours[s.project] += sessionDurationMinutes(s) / 60;
  });

  // Timeline segments
  const timeline = filtered
    .filter((s) => s.start)
    .map((s) => ({
      start: minuteOfDay(s.start),
      end: s.stop ? minuteOfDay(s.stop) : minuteOfDay(new Date().toISOString()),
      project: s.project,
      label: s.notes?.split("\n")[0] || s.project,
    }))
    .filter((t) => t.end > t.start);

  return {
    totalMinutes,
    deepMinutes,
    switches,
    focusScore,
    categories,
    projectHours,
    timeline,
    sessions: filtered,
  };
}

function minuteOfDay(isoStr) {
  const d = new Date(isoStr);
  return d.getHours() * 60 + d.getMinutes();
}

// Sparkline data from recent days
export function sparklineData(sessions, days = 7, metric = "total") {
  const data = [];
  const now = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const day = new Date(now);
    day.setDate(now.getDate() - i);
    const dayStr = day.toISOString().slice(0, 10);
    const daySessions = sessions.filter((s) => s.start?.startsWith(dayStr));
    if (metric === "total") {
      data.push(daySessions.reduce((sum, s) => sum + sessionDurationMinutes(s), 0) / 60);
    } else if (metric === "deep") {
      data.push(
        daySessions
          .filter((s) => classifyActivity(s) === "deep_work")
          .reduce((sum, s) => sum + sessionDurationMinutes(s), 0) / 60,
      );
    } else if (metric === "switches") {
      let sw = 0;
      for (let j = 1; j < daySessions.length; j++) {
        if (daySessions[j].project !== daySessions[j - 1].project) sw++;
      }
      data.push(sw);
    } else if (metric === "focus") {
      const stats = computeStats(daySessions, "all");
      data.push(stats.focusScore);
    }
  }
  return data;
}
