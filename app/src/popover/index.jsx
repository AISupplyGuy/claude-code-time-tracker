import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import { TTIcon } from "../shared/icons.jsx";
import { useTimetracker } from "../shared/hooks.js";
import {
  formatHM,
  formatTime,
  sessionDurationMinutes,
  isToday,
  computeStats,
  classifyActivity,
  getProjectColor,
} from "../shared/data.js";

// ── Style tokens ─────────────────────────────────────────────
const C = {
  bg: "rgba(44,44,50,0.94)",
  bgDark: "rgba(28,28,34,0.94)",
  border: "rgba(255,255,255,0.14)",
  dimBorder: "rgba(255,255,255,0.08)",
  text: "rgba(255,255,255,0.96)",
  text2: "rgba(255,255,255,0.78)",
  text3: "rgba(255,255,255,0.48)",
  text4: "rgba(255,255,255,0.42)",
  claude: "#D97757",
};

// ── Primitives ───────────────────────────────────────────────
const Divider = ({ inset = 14 }) => (
  <div style={{ height: 0.5, background: C.dimBorder, margin: `0 ${inset}px` }} />
);

const SectionHead = ({ label, right }) => (
  <div
    style={{
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      padding: "10px 16px 6px",
      fontSize: 11,
      fontWeight: 600,
      letterSpacing: 0.3,
      color: C.text4,
      textTransform: "uppercase",
    }}
  >
    <span>{label}</span>
    {right}
  </div>
);

const PillBtn = ({ icon, label, primary, onClick }) => (
  <button
    onClick={onClick}
    style={{
      all: "unset",
      cursor: "pointer",
      display: "inline-flex",
      alignItems: "center",
      gap: 5,
      padding: "6px 11px",
      borderRadius: 7,
      background: primary ? "rgba(255,255,255,0.14)" : "rgba(255,255,255,0.06)",
      border: `0.5px solid rgba(255,255,255,${primary ? 0.18 : 0.1})`,
      boxShadow: primary ? "0 1px 0 rgba(255,255,255,0.06) inset" : "none",
      fontSize: 12,
      fontWeight: 600,
      color: C.text,
    }}
  >
    <TTIcon name={icon} size={12} />
    {label}
  </button>
);

const IconBtn = ({ icon, onClick }) => (
  <button
    onClick={onClick}
    style={{
      all: "unset",
      cursor: "pointer",
      width: 28,
      height: 28,
      borderRadius: 7,
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      background: "rgba(255,255,255,0.06)",
      border: `0.5px solid ${C.dimBorder}`,
      color: "rgba(255,255,255,0.75)",
    }}
  >
    <TTIcon name={icon} size={13} />
  </button>
);

// ── Hero ─────────────────────────────────────────────────────
function Hero({ active, elapsed, project, onPause, onStop, onSwitch, onNote }) {
  if (!active) {
    return (
      <div style={{ padding: "20px 16px", textAlign: "center" }}>
        <div style={{ fontSize: 14, color: C.text3, marginBottom: 8 }}>
          No timer running
        </div>
        <div style={{ fontSize: 12, color: C.text4 }}>
          Start working in Claude Code — timer auto-starts
        </div>
      </div>
    );
  }

  const startTime = formatTime(new Date(active.start));

  return (
    <div style={{ padding: "14px 16px 12px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
        <span
          style={{
            width: 7,
            height: 7,
            borderRadius: "50%",
            background: project?.color || "#F5A524",
            boxShadow: `0 0 8px ${project?.color || "#F5A524"}90`,
            animation: "tt-pulse 1.6s ease-in-out infinite",
          }}
        />
        <span style={{ fontSize: 13, fontWeight: 600, color: C.text }}>
          {active.project}
        </span>
        <span style={{ fontSize: 12, color: C.text4 }}>· {project?.client || "—"}</span>
        <div style={{ flex: 1 }} />
        <button
          onClick={onSwitch}
          style={{
            all: "unset",
            cursor: "pointer",
            display: "inline-flex",
            alignItems: "center",
            gap: 3,
            padding: "3px 7px",
            borderRadius: 6,
            background: "rgba(255,255,255,0.06)",
            border: `0.5px solid ${C.dimBorder}`,
            fontSize: 11,
            fontWeight: 500,
            color: C.text2,
          }}
        >
          <TTIcon name="switch" size={11} /> Switch
        </button>
      </div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
        <div
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 38,
            fontWeight: 500,
            letterSpacing: -1.2,
            lineHeight: 1,
            color: C.text,
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {elapsed}
        </div>
        <div style={{ fontSize: 11, color: C.text3, fontWeight: 500, paddingBottom: 3 }}>
          started {startTime}
        </div>
      </div>
      <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
        <PillBtn icon="pause" label="Pause" primary onClick={onPause} />
        <PillBtn icon="stop" label="Stop" onClick={onStop} />
        <PillBtn icon="note" label="Note" onClick={onNote} />
        <div style={{ flex: 1 }} />
        <IconBtn icon="dots" />
      </div>
    </div>
  );
}

// ── Claude Card ──────────────────────────────────────────────
function ClaudeCard({ active }) {
  const reads = active?.reads || 0;
  const edits = active?.edits || 0;
  const bash = active?.bash_calls || 0;
  const activity = classifyActivity(active || {});
  const activityLabels = {
    deep_work: "Heavy editing session — deep focus work",
    investigation: "Mostly reading and exploring code",
    tooling: "Lots of terminal work — building/testing",
    mixed: "Mixed activity across reading, editing, and terminal",
  };

  return (
    <div style={{ padding: "0 12px" }}>
      <div
        style={{
          position: "relative",
          borderRadius: 12,
          overflow: "hidden",
          background: `linear-gradient(180deg, rgba(217,119,87,0.14), rgba(217,119,87,0.04))`,
          border: "0.5px solid rgba(217,119,87,0.25)",
          padding: "10px 12px 12px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
          <span
            style={{
              width: 18,
              height: 18,
              borderRadius: 5,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              background: `linear-gradient(135deg, ${C.claude}, #B85D3E)`,
              color: "#fff",
            }}
          >
            <TTIcon name="sparkle" size={11} />
          </span>
          <span
            style={{
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: 0.3,
              color: "#E8A989",
              textTransform: "uppercase",
            }}
          >
            Claude is watching
          </span>
        </div>
        <div style={{ fontSize: 12.5, lineHeight: 1.45, color: "rgba(255,255,255,0.86)" }}>
          {activityLabels[activity] || "Tracking your work…"}
        </div>
        <div style={{ display: "flex", gap: 6, marginTop: 9, flexWrap: "wrap" }}>
          {reads > 0 && <Tag label={`${reads} reads`} />}
          {edits > 0 && <Tag label={`${edits} edits`} />}
          {bash > 0 && <Tag label={`${bash} bash`} />}
        </div>
      </div>
    </div>
  );
}

const Tag = ({ label }) => (
  <span
    style={{
      fontSize: 10.5,
      fontWeight: 500,
      padding: "2px 7px",
      borderRadius: 4,
      background: "rgba(255,255,255,0.06)",
      color: "rgba(255,255,255,0.6)",
      border: `0.5px solid rgba(255,255,255,0.06)`,
    }}
  >
    {label}
  </span>
);

// ── Today Strip ──────────────────────────────────────────────
function TodayStrip({ stats }) {
  const h = Math.floor(stats.totalMinutes / 60);
  const m = Math.round(stats.totalMinutes % 60);
  const dayStart = 8 * 60;
  const dayEnd = 19 * 60;
  const range = dayEnd - dayStart;

  return (
    <div style={{ padding: "2px 16px 12px" }}>
      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          justifyContent: "space-between",
          marginBottom: 7,
        }}
      >
        <span
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 18,
            fontWeight: 500,
            color: C.text,
            letterSpacing: -0.3,
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {h}h {String(m).padStart(2, "0")}m
        </span>
        <span style={{ fontSize: 11, color: C.text4, marginLeft: 6 }}>today</span>
      </div>
      <div
        style={{
          position: "relative",
          height: 22,
          borderRadius: 5,
          background: "rgba(255,255,255,0.04)",
          border: `0.5px solid rgba(255,255,255,0.05)`,
          overflow: "hidden",
        }}
      >
        {stats.timeline.map((seg, i) => {
          const left = Math.max(0, ((seg.start - dayStart) / range) * 100);
          const width = Math.max(0.5, ((seg.end - seg.start) / range) * 100);
          const isLive = i === stats.timeline.length - 1 && !seg.stop;
          const color = getProjectColor(
            Object.keys(stats.projectHours).indexOf(seg.project)
          );
          return (
            <div
              key={i}
              style={{
                position: "absolute",
                top: 0,
                bottom: 0,
                left: `${left}%`,
                width: `${width}%`,
                background: color,
                opacity: isLive ? 1 : 0.85,
                borderRight: "0.5px solid rgba(0,0,0,0.25)",
                boxShadow: isLive ? `0 0 10px ${color}` : "none",
              }}
            />
          );
        })}
      </div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginTop: 4,
          fontSize: 9.5,
          color: "rgba(255,255,255,0.32)",
          fontVariantNumeric: "tabular-nums",
        }}
      >
        <span>8 AM</span>
        <span>10</span>
        <span>12 PM</span>
        <span>2</span>
        <span>4</span>
        <span>6 PM</span>
      </div>
    </div>
  );
}

// ── Session Row ──────────────────────────────────────────────
function SessionRow({ session, projectMap }) {
  const project = projectMap[session.project];
  const dur = sessionDurationMinutes(session);
  const time = formatTime(new Date(session.start));
  return (
    <div style={{ display: "flex", gap: 10, padding: "9px 16px", alignItems: "flex-start" }}>
      <div
        style={{
          width: 3,
          alignSelf: "stretch",
          minHeight: 28,
          borderRadius: 2,
          background: project?.color || "#64748B",
          marginTop: 2,
        }}
      />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12.5, fontWeight: 600, color: C.text }}>{session.project}</div>
        <div style={{ fontSize: 11, color: C.text3, display: "flex", gap: 8 }}>
          <span>{time}</span>
          {session.notes && (
            <>
              <span>·</span>
              <span style={{ color: C.text2 }}>
                {session.notes.split("\n")[0].slice(0, 40)}
              </span>
            </>
          )}
        </div>
      </div>
      <span
        style={{
          fontSize: 11.5,
          fontFamily: "var(--font-mono)",
          fontWeight: 500,
          color: "rgba(255,255,255,0.72)",
          whiteSpace: "nowrap",
          fontVariantNumeric: "tabular-nums",
          marginTop: 2,
        }}
      >
        {formatHM(dur)}
      </span>
    </div>
  );
}

// ── Footer ───────────────────────────────────────────────────
function Footer({ onOpenDashboard }) {
  return (
    <div
      style={{
        padding: "8px 10px",
        display: "flex",
        alignItems: "center",
        gap: 4,
        borderTop: `0.5px solid rgba(255,255,255,0.06)`,
        background: "rgba(0,0,0,0.25)",
      }}
    >
      <FooterBtn icon="calendar" label="Day" />
      <FooterBtn icon="folder" label="Projects" />
      <FooterBtn icon="gear" />
      <div style={{ flex: 1 }} />
      <button
        onClick={onOpenDashboard}
        style={{
          all: "unset",
          cursor: "pointer",
          display: "inline-flex",
          alignItems: "center",
          gap: 5,
          padding: "5px 9px",
          borderRadius: 6,
          fontSize: 11.5,
          fontWeight: 500,
          color: C.text2,
        }}
      >
        Open dashboard <TTIcon name="expand" size={11} />
      </button>
    </div>
  );
}

const FooterBtn = ({ icon, label }) => (
  <button
    style={{
      all: "unset",
      cursor: "pointer",
      display: "inline-flex",
      alignItems: "center",
      gap: 5,
      padding: "5px 9px",
      borderRadius: 6,
      fontSize: 11.5,
      fontWeight: 500,
      color: "rgba(255,255,255,0.7)",
    }}
  >
    <TTIcon name={icon} size={12} /> {label}
  </button>
);

// ── Main Popover ─────────────────────────────────────────────
function Popover() {
  const { sessions, projects, active, elapsed, runCmd } = useTimetracker();
  const [noteMode, setNoteMode] = useState(false);
  const [noteText, setNoteText] = useState("");

  const project = active ? projects[active.project] : null;
  const todaySessions = sessions.filter((s) => isToday(s.start));
  const stats = computeStats(sessions, "today");
  const recent = todaySessions
    .filter((s) => s.stop)
    .sort((a, b) => new Date(b.start) - new Date(a.start))
    .slice(0, 4);

  const handleNote = async () => {
    if (noteMode && noteText.trim()) {
      await window.timetracker.addNote(noteText.trim());
      setNoteText("");
      setNoteMode(false);
    } else {
      setNoteMode(true);
    }
  };

  return (
    <div
      style={{
        width: 380,
        height: 560,
        borderRadius: 14,
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        background: `linear-gradient(180deg, ${C.bg}, ${C.bgDark})`,
        backdropFilter: "blur(50px) saturate(180%)",
        WebkitBackdropFilter: "blur(50px) saturate(180%)",
        border: `0.5px solid ${C.border}`,
        boxShadow:
          "0 0 0 0.5px rgba(0,0,0,0.8), 0 24px 70px rgba(0,0,0,0.65), 0 4px 14px rgba(0,0,0,0.45), inset 0 0.5px 0 rgba(255,255,255,0.12)",
        color: "#fff",
      }}
    >
      <Hero
        active={active}
        elapsed={elapsed}
        project={project}
        onPause={() => runCmd("stop")}
        onStop={() => runCmd("stop")}
        onSwitch={() => {}}
        onNote={handleNote}
      />

      {noteMode && (
        <div style={{ padding: "0 12px 8px" }}>
          <div style={{ display: "flex", gap: 6 }}>
            <input
              autoFocus
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleNote()}
              placeholder="Add a note…"
              style={{
                flex: 1,
                background: "rgba(255,255,255,0.06)",
                border: `0.5px solid ${C.dimBorder}`,
                borderRadius: 7,
                padding: "6px 10px",
                fontSize: 12,
                color: "#fff",
                outline: "none",
              }}
            />
            <PillBtn icon="note" label="Save" primary onClick={handleNote} />
          </div>
        </div>
      )}

      <Divider />
      {active && (
        <>
          <div style={{ padding: "10px 0 2px" }}>
            <ClaudeCard active={active} />
          </div>
          <Divider inset={0} />
        </>
      )}

      <SectionHead
        label="Today"
        right={
          <span
            style={{
              fontSize: 10.5,
              fontWeight: 500,
              color: C.text4,
              textTransform: "none",
              letterSpacing: 0,
            }}
          >
            {new Date().toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
          </span>
        }
      />
      <TodayStrip stats={stats} />
      <Divider inset={0} />

      <SectionHead
        label="Recent sessions"
        right={
          <span
            style={{
              fontSize: 10.5,
              fontWeight: 500,
              color: "rgba(255,255,255,0.5)",
              textTransform: "none",
              letterSpacing: 0,
              cursor: "pointer",
            }}
            onClick={() => window.timetracker.openDashboard()}
          >
            See all
          </span>
        }
      />
      <div style={{ flex: 1, overflow: "auto", paddingBottom: 6 }}>
        {recent.length === 0 && (
          <div style={{ padding: "16px", fontSize: 12, color: C.text4, textAlign: "center" }}>
            No sessions yet today
          </div>
        )}
        {recent.map((s, i) => (
          <SessionRow key={i} session={s} projectMap={projects} />
        ))}
      </div>

      <Footer onOpenDashboard={() => window.timetracker.openDashboard()} />
    </div>
  );
}

createRoot(document.getElementById("root")).render(<Popover />);
