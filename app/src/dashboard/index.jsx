import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import { TTIcon } from "../shared/icons.jsx";
import { useTimetracker } from "../shared/hooks.js";
import {
  formatHM,
  formatTime,
  sessionDurationMinutes,
  computeStats,
  sparklineData,
  classifyActivity,
  getProjectColor,
} from "../shared/data.js";

const C = {
  text: "rgba(255,255,255,0.96)",
  text2: "rgba(255,255,255,0.78)",
  text3: "rgba(255,255,255,0.48)",
  text4: "rgba(255,255,255,0.42)",
  dimBorder: "rgba(255,255,255,0.06)",
  claude: "#D97757",
};

// ── Sparkline SVG ────────────────────────────────────────────
function Spark({ data, color = "#86E6B1" }) {
  const max = Math.max(...data, 1);
  return (
    <svg width="64" height="22" viewBox="0 0 64 22">
      <polyline
        fill="none"
        stroke={color}
        strokeWidth="1.3"
        points={data
          .map((d, i) => `${(i / (data.length - 1)) * 62 + 1},${22 - (d / max) * 18 - 2}`)
          .join(" ")}
      />
    </svg>
  );
}

// ── Stat Card ────────────────────────────────────────────────
function StatCard({ label, value, sub, sparkline, color = "#fff" }) {
  return (
    <div
      style={{
        flex: 1,
        padding: "12px 14px",
        background: "rgba(255,255,255,0.035)",
        border: `0.5px solid ${C.dimBorder}`,
        borderRadius: 10,
      }}
    >
      <div
        style={{
          fontSize: 10.5,
          fontWeight: 600,
          letterSpacing: 0.3,
          color: C.text4,
          textTransform: "uppercase",
          marginBottom: 6,
        }}
      >
        {label}
      </div>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
        <span
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 22,
            fontWeight: 500,
            color,
            letterSpacing: -0.4,
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {value}
        </span>
        {sparkline}
      </div>
      <div style={{ fontSize: 10.5, color: C.text4, marginTop: 3 }}>{sub}</div>
    </div>
  );
}

// ── Now Playing Hero ─────────────────────────────────────────
function NowPlaying({ active, elapsed, project }) {
  const { runCmd } = useTimetracker();
  if (!active) return null;
  return (
    <div
      style={{
        position: "relative",
        overflow: "hidden",
        borderRadius: 12,
        padding: "14px 16px",
        background: `radial-gradient(circle at 100% 0%, ${project?.color || "#F5A524"}22 0%, transparent 55%),
          linear-gradient(180deg, rgba(255,255,255,0.05), rgba(255,255,255,0.02))`,
        border: `0.5px solid rgba(255,255,255,0.09)`,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 7 }}>
        <span
          style={{
            width: 6,
            height: 6,
            borderRadius: "50%",
            background: project?.color || "#F5A524",
            boxShadow: `0 0 8px ${project?.color || "#F5A524"}`,
            animation: "tt-pulse 1.6s ease-in-out infinite",
          }}
        />
        <span
          style={{
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: 0.5,
            color: C.text3,
            textTransform: "uppercase",
          }}
        >
          Tracking now
        </span>
      </div>
      <div style={{ display: "flex", alignItems: "flex-end", gap: 14, flexWrap: "wrap" }}>
        <div
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 38,
            fontWeight: 500,
            color: "#fff",
            letterSpacing: -1,
            lineHeight: 1,
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {elapsed}
        </div>
        <div style={{ flex: 1, minWidth: 180, marginBottom: 4 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: C.text, marginBottom: 2 }}>
            {active.project}
          </div>
          <div style={{ fontSize: 12, color: C.text3 }}>
            {project?.client || "—"} · started {formatTime(new Date(active.start))}
          </div>
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          <PillBtn icon="pause" label="Pause" primary onClick={() => runCmd("stop")} />
          <PillBtn icon="stop" label="Stop" onClick={() => runCmd("stop")} />
        </div>
      </div>
    </div>
  );
}

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
      fontSize: 12,
      fontWeight: 600,
      color: C.text,
    }}
  >
    <TTIcon name={icon} size={12} />
    {label}
  </button>
);

// ── Big Timeline ─────────────────────────────────────────────
function BigTimeline({ stats, projectMap }) {
  const dayStart = 8 * 60;
  const dayEnd = 19 * 60;
  const range = dayEnd - dayStart;
  const hours = [];
  for (let h = 8; h <= 19; h++) hours.push(h);

  const nowMin = new Date().getHours() * 60 + new Date().getMinutes();

  return (
    <div
      style={{
        borderRadius: 10,
        padding: "12px 14px",
        background: "rgba(255,255,255,0.03)",
        border: `0.5px solid ${C.dimBorder}`,
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginBottom: 10,
          alignItems: "baseline",
        }}
      >
        <div style={{ fontSize: 12.5, fontWeight: 600, color: C.text2 }}>Timeline</div>
        <div style={{ display: "flex", gap: 8, fontSize: 10.5, color: C.text3 }}>
          {Object.keys(stats.projectHours)
            .slice(0, 4)
            .map((name, i) => (
              <div key={name} style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <span
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: 2,
                    background: projectMap[name]?.color || getProjectColor(i),
                  }}
                />
                {name}
              </div>
            ))}
        </div>
      </div>
      <div
        style={{
          position: "relative",
          height: 44,
          borderRadius: 6,
          background: "rgba(0,0,0,0.28)",
          border: `0.5px solid rgba(255,255,255,0.05)`,
          overflow: "hidden",
        }}
      >
        {stats.timeline.map((seg, i) => {
          const color = projectMap[seg.project]?.color || getProjectColor(i);
          const left = Math.max(0, ((seg.start - dayStart) / range) * 100);
          const width = Math.max(0.5, ((seg.end - seg.start) / range) * 100);
          const isLive = i === stats.timeline.length - 1;
          return (
            <div
              key={i}
              title={seg.label}
              style={{
                position: "absolute",
                top: 0,
                bottom: 0,
                left: `${left}%`,
                width: `${width}%`,
                background: `linear-gradient(180deg, ${color}, ${color}C0)`,
                opacity: isLive ? 1 : 0.92,
                borderRight: "0.5px solid rgba(0,0,0,0.3)",
                boxShadow: isLive ? `0 0 16px ${color}AA` : "none",
              }}
            >
              {width > 6 && (
                <div
                  style={{
                    position: "absolute",
                    top: "50%",
                    left: 6,
                    transform: "translateY(-50%)",
                    fontSize: 9.5,
                    fontWeight: 600,
                    color: "rgba(0,0,0,0.55)",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    width: "calc(100% - 10px)",
                  }}
                >
                  {seg.label}
                </div>
              )}
            </div>
          );
        })}
        {/* now line */}
        {nowMin >= dayStart && nowMin <= dayEnd && (
          <div
            style={{
              position: "absolute",
              top: -2,
              bottom: -2,
              left: `${((nowMin - dayStart) / range) * 100}%`,
              width: 1,
              background: "#fff",
              boxShadow: "0 0 4px rgba(255,255,255,0.8)",
            }}
          >
            <div
              style={{
                position: "absolute",
                top: -4,
                left: -3,
                width: 7,
                height: 7,
                borderRadius: "50%",
                background: "#fff",
              }}
            />
          </div>
        )}
      </div>
      <div style={{ display: "flex", marginTop: 6, position: "relative", height: 12 }}>
        {hours.map((h) => {
          const left = ((h * 60 - dayStart) / range) * 100;
          const label = h === 12 ? "12p" : h < 12 ? `${h}a` : `${h - 12}p`;
          return (
            <span
              key={h}
              style={{
                position: "absolute",
                left: `${left}%`,
                transform: "translateX(-50%)",
                fontSize: 10,
                color: "rgba(255,255,255,0.38)",
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {label}
            </span>
          );
        })}
      </div>
    </div>
  );
}

// ── Donut Chart ──────────────────────────────────────────────
function Donut({ stats }) {
  const R = 36;
  const C_CIRC = 2 * Math.PI * R;
  let acc = 0;
  const totalH = Math.floor(stats.totalMinutes / 60);
  const totalM = Math.round(stats.totalMinutes % 60);

  return (
    <div
      style={{
        borderRadius: 10,
        padding: "12px 14px",
        background: "rgba(255,255,255,0.03)",
        border: `0.5px solid ${C.dimBorder}`,
        display: "flex",
        gap: 16,
        alignItems: "center",
      }}
    >
      <div style={{ position: "relative", width: 92, height: 92 }}>
        <svg width="92" height="92" viewBox="0 0 92 92">
          <circle cx="46" cy="46" r={R} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="10" />
          {stats.categories
            .filter((c) => c.pct > 0)
            .map((cat, i) => {
              const len = (cat.pct / 100) * C_CIRC;
              const el = (
                <circle
                  key={i}
                  cx="46"
                  cy="46"
                  r={R}
                  fill="none"
                  stroke={cat.color}
                  strokeWidth="10"
                  strokeDasharray={`${len} ${C_CIRC}`}
                  strokeDashoffset={-acc}
                  transform="rotate(-90 46 46)"
                  strokeLinecap="butt"
                />
              );
              acc += len;
              return el;
            })}
        </svg>
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexDirection: "column",
          }}
        >
          <span
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 17,
              fontWeight: 500,
              color: "#fff",
            }}
          >
            {totalH}h {String(totalM).padStart(2, "0")}m
          </span>
          <span style={{ fontSize: 9.5, color: C.text4 }}>today</span>
        </div>
      </div>
      <div style={{ flex: 1 }}>
        {stats.categories.map((cat, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
            <span style={{ width: 7, height: 7, borderRadius: 2, background: cat.color }} />
            <span style={{ flex: 1, fontSize: 12, color: C.text2 }}>{cat.name}</span>
            <span
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 11.5,
                color: C.text3,
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {cat.pct}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Claude Recap ─────────────────────────────────────────────
function ClaudeRecap({ stats }) {
  const topProject = Object.entries(stats.projectHours).sort((a, b) => b[1] - a[1])[0];
  const topName = topProject?.[0] || "your work";
  const topHours = topProject ? formatHM(topProject[1] * 60) : "";

  return (
    <div
      style={{
        borderRadius: 10,
        padding: "14px 16px",
        background: `linear-gradient(180deg, rgba(217,119,87,0.12), rgba(217,119,87,0.02))`,
        border: "0.5px solid rgba(217,119,87,0.25)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
        <span
          style={{
            width: 22,
            height: 22,
            borderRadius: 6,
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            background: `linear-gradient(135deg, ${C.claude}, #B85D3E)`,
            color: "#fff",
          }}
        >
          <TTIcon name="sparkle" size={13} />
        </span>
        <span style={{ fontSize: 12, fontWeight: 700, color: C.text }}>Today's recap</span>
        <span
          style={{
            fontSize: 10.5,
            fontWeight: 600,
            padding: "1px 6px",
            borderRadius: 3,
            background: "rgba(217,119,87,0.2)",
            color: "#F0B99C",
          }}
        >
          by Claude
        </span>
      </div>
      <div style={{ fontSize: 12.5, lineHeight: 1.55, color: C.text2 }}>
        {stats.totalMinutes > 0 ? (
          <>
            You've tracked <b style={{ color: "#fff", fontWeight: 600 }}>{formatHM(stats.totalMinutes)}</b> today
            across {Object.keys(stats.projectHours).length} project
            {Object.keys(stats.projectHours).length !== 1 ? "s" : ""}.
            {topProject && (
              <>
                {" "}Most time on <b style={{ color: "#fff", fontWeight: 600 }}>{topName}</b> ({topHours}).
              </>
            )}
            {" "}Focus score: {stats.focusScore}/100 with {stats.switches} context switch
            {stats.switches !== 1 ? "es" : ""}.
          </>
        ) : (
          "No sessions tracked today yet. Start working in Claude Code to begin."
        )}
      </div>
    </div>
  );
}

// ── Sessions Table ───────────────────────────────────────────
function SessionsTable({ sessions, projectMap }) {
  return (
    <div
      style={{
        borderRadius: 10,
        padding: "6px 0 4px",
        background: "rgba(255,255,255,0.03)",
        border: `0.5px solid ${C.dimBorder}`,
      }}
    >
      <div
        style={{
          display: "flex",
          padding: "8px 14px 6px",
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: 0.4,
          color: "rgba(255,255,255,0.38)",
          textTransform: "uppercase",
        }}
      >
        <span style={{ width: 68 }}>Start</span>
        <span style={{ flex: 1 }}>Session</span>
        <span style={{ width: 70, textAlign: "right" }}>Duration</span>
      </div>
      {sessions.length === 0 && (
        <div style={{ padding: "20px 14px", fontSize: 12, color: C.text4, textAlign: "center" }}>
          No sessions for this period
        </div>
      )}
      {sessions.map((s, i) => {
        const project = projectMap[s.project];
        const dur = sessionDurationMinutes(s);
        const time = formatTime(new Date(s.start));
        const actType = classifyActivity(s);
        return (
          <div
            key={i}
            style={{
              display: "flex",
              padding: "9px 14px",
              alignItems: "flex-start",
              borderTop: "0.5px solid rgba(255,255,255,0.04)",
            }}
          >
            <span
              style={{
                width: 68,
                fontSize: 11.5,
                color: C.text3,
                fontFamily: "var(--font-mono)",
                paddingTop: 1,
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {time}
            </span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 3 }}>
                <span
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: 2,
                    background: project?.color || "#64748B",
                  }}
                />
                <span style={{ fontSize: 12.5, fontWeight: 600, color: C.text }}>
                  {s.project}
                </span>
                <span
                  style={{
                    fontSize: 10.5,
                    padding: "1px 5px",
                    borderRadius: 3,
                    background: `${project?.color || "#64748B"}22`,
                    color: project?.color || "#64748B",
                    fontWeight: 600,
                  }}
                >
                  {actType.replace("_", " ")}
                </span>
              </div>
              {s.notes && (
                <div
                  style={{
                    fontSize: 11.5,
                    color: C.text3,
                    lineHeight: 1.45,
                    paddingRight: 24,
                  }}
                >
                  {s.notes.split("\n")[0].slice(0, 80)}
                </div>
              )}
            </div>
            <span
              style={{
                width: 70,
                textAlign: "right",
                fontSize: 12,
                fontFamily: "var(--font-mono)",
                fontWeight: 500,
                color: C.text2,
                paddingTop: 1,
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {formatHM(dur)}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ── Sidebar ──────────────────────────────────────────────────
function Sidebar({ view, setView, stats, projectMap }) {
  const views = [
    { icon: "bolt", label: "Now", key: "now", badge: stats.sessions.some((s) => !s.stop) ? "live" : null },
    { icon: "calendar", label: "Day", key: "today" },
    { icon: "calendar", label: "Week", key: "week" },
    { icon: "calendar", label: "Month", key: "month" },
  ];
  const library = [
    { icon: "folder", label: "Projects", key: "projects" },
    { icon: "tag", label: "Tags", key: "tags" },
    { icon: "sparkle", label: "Claude rules", key: "rules" },
  ];

  return (
    <div
      style={{
        width: 200,
        height: "100%",
        borderRight: `0.5px solid ${C.dimBorder}`,
        display: "flex",
        flexDirection: "column",
        background: "rgba(0,0,0,0.18)",
      }}
    >
      <div style={{ height: 48, WebkitAppRegion: "drag" }} />
      <div style={{ padding: "2px 8px" }}>
        {views.map((v) => (
          <SideItem
            key={v.key}
            icon={v.icon}
            label={v.label}
            badge={v.badge}
            active={view === v.key}
            onClick={() => setView(v.key)}
          />
        ))}
      </div>
      <div
        style={{
          padding: "14px 14px 4px",
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: 0.4,
          color: "rgba(255,255,255,0.35)",
          textTransform: "uppercase",
        }}
      >
        Library
      </div>
      <div style={{ padding: "2px 8px" }}>
        {library.map((v) => (
          <SideItem key={v.key} icon={v.icon} label={v.label} active={false} onClick={() => {}} />
        ))}
      </div>
      <div
        style={{
          padding: "14px 14px 4px",
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: 0.4,
          color: "rgba(255,255,255,0.35)",
          textTransform: "uppercase",
        }}
      >
        Projects today
      </div>
      <div style={{ padding: "2px 8px 10px", flex: 1, overflow: "auto" }}>
        {Object.entries(stats.projectHours).map(([name, hours], i) => (
          <div
            key={name}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "5px 8px",
              borderRadius: 6,
              fontSize: 12,
              color: C.text2,
            }}
          >
            <span
              style={{
                width: 7,
                height: 7,
                borderRadius: 2,
                background: projectMap[name]?.color || getProjectColor(i),
              }}
            />
            <span
              style={{
                flex: 1,
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {name}
            </span>
            <span
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 10.5,
                color: C.text4,
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {hours.toFixed(1)}h
            </span>
          </div>
        ))}
      </div>
      <div
        style={{
          padding: "10px 14px",
          borderTop: `0.5px solid rgba(255,255,255,0.05)`,
          display: "flex",
          alignItems: "center",
          gap: 8,
        }}
      >
        <TTIcon name="gear" size={13} color="rgba(255,255,255,0.55)" />
        <span style={{ fontSize: 11.5, fontWeight: 500, color: C.text2 }}>Settings</span>
      </div>
    </div>
  );
}

function SideItem({ icon, label, active, badge, onClick }) {
  return (
    <div
      onClick={onClick}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 9,
        padding: "6px 9px",
        borderRadius: 6,
        fontSize: 12.5,
        fontWeight: active ? 600 : 500,
        color: active ? C.text : "rgba(255,255,255,0.72)",
        background: active ? "rgba(255,255,255,0.08)" : "transparent",
        marginBottom: 2,
        cursor: "pointer",
      }}
    >
      <TTIcon name={icon} size={13} color={active ? "#fff" : "rgba(255,255,255,0.6)"} />
      <span style={{ flex: 1 }}>{label}</span>
      {badge && (
        <span
          style={{
            fontSize: 9.5,
            fontWeight: 700,
            letterSpacing: 0.4,
            padding: "1px 5px",
            borderRadius: 3,
            background: "rgba(255,90,90,0.2)",
            color: "#FF9090",
            textTransform: "uppercase",
          }}
        >
          {badge}
        </span>
      )}
    </div>
  );
}

// ── Toolbar ──────────────────────────────────────────────────
function Toolbar({ view, searchQuery, setSearchQuery }) {
  const viewLabels = {
    now: "Now",
    today: "Today",
    week: "This Week",
    month: "This Month",
  };
  const now = new Date();
  const dateStr = now.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  return (
    <div
      style={{
        height: 48,
        display: "flex",
        alignItems: "center",
        padding: "0 16px",
        gap: 10,
        borderBottom: `0.5px solid ${C.dimBorder}`,
        WebkitAppRegion: "drag",
      }}
    >
      <div style={{ fontSize: 17, fontWeight: 700, color: C.text, letterSpacing: -0.3 }}>
        {viewLabels[view] || view}
      </div>
      <div style={{ fontSize: 13, color: C.text3, fontWeight: 500 }}>{dateStr}</div>
      <div style={{ flex: 1 }} />
      <div
        style={{
          display: "flex",
          alignItems: "center",
          background: "rgba(255,255,255,0.06)",
          border: `0.5px solid ${C.dimBorder}`,
          borderRadius: 7,
          padding: "4px 10px",
          gap: 6,
          width: 200,
          WebkitAppRegion: "no-drag",
        }}
      >
        <TTIcon name="search" size={12} color="rgba(255,255,255,0.5)" />
        <input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search sessions…"
          style={{
            all: "unset",
            flex: 1,
            fontSize: 12,
            color: C.text,
          }}
        />
        <span
          style={{
            fontSize: 10.5,
            padding: "1px 5px",
            borderRadius: 3,
            background: "rgba(255,255,255,0.08)",
            color: C.text3,
            fontFamily: "var(--font-mono)",
          }}
        >
          ⌘K
        </span>
      </div>
    </div>
  );
}

// ── Dashboard ────────────────────────────────────────────────
function Dashboard() {
  const { sessions, projects, active, elapsed } = useTimetracker();
  const [view, setView] = useState("today");
  const [searchQuery, setSearchQuery] = useState("");

  const filter = view === "now" ? "today" : view;
  const stats = computeStats(sessions, filter);
  const project = active ? projects[active.project] : null;

  // Sparkline data
  const totalSpark = sparklineData(sessions, 7, "total");
  const deepSpark = sparklineData(sessions, 7, "deep");
  const switchSpark = sparklineData(sessions, 7, "switches");
  const focusSpark = sparklineData(sessions, 7, "focus");

  // Filter sessions for table
  let tableSessions = [...stats.sessions]
    .filter((s) => s.stop)
    .sort((a, b) => new Date(b.start) - new Date(a.start));

  if (searchQuery) {
    const q = searchQuery.toLowerCase();
    tableSessions = tableSessions.filter(
      (s) =>
        s.project?.toLowerCase().includes(q) ||
        s.notes?.toLowerCase().includes(q),
    );
  }

  return (
    <div
      style={{
        width: "100vw",
        height: "100vh",
        display: "flex",
        background: "rgba(28,28,32,0.88)",
        backdropFilter: "blur(60px) saturate(180%)",
        WebkitBackdropFilter: "blur(60px) saturate(180%)",
        color: "#fff",
        borderRadius: 14,
        overflow: "hidden",
      }}
    >
      <Sidebar view={view} setView={setView} stats={stats} projectMap={projects} />
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
        <Toolbar view={view} searchQuery={searchQuery} setSearchQuery={setSearchQuery} />
        <div
          style={{
            flex: 1,
            overflow: "auto",
            padding: 16,
            display: "flex",
            flexDirection: "column",
            gap: 12,
          }}
        >
          {/* Stat cards */}
          <div style={{ display: "flex", gap: 10 }}>
            <StatCard
              label="Tracked"
              value={formatHM(stats.totalMinutes)}
              sub={`${Object.keys(stats.projectHours).length} projects`}
              sparkline={<Spark data={totalSpark} color="#86E6B1" />}
            />
            <StatCard
              label="Deep work"
              value={formatHM(stats.deepMinutes)}
              sub={stats.totalMinutes > 0 ? `${Math.round((stats.deepMinutes / stats.totalMinutes) * 100)}% of day` : "—"}
              sparkline={<Spark data={deepSpark} color="#7AB7FF" />}
            />
            <StatCard
              label="Context switches"
              value={String(stats.switches)}
              sub="project changes"
              sparkline={<Spark data={switchSpark} color="#F0B99C" />}
            />
            <StatCard
              label="Focus score"
              value={String(stats.focusScore)}
              sub="Claude's rating"
              sparkline={<Spark data={focusSpark} color="#D9A3E6" />}
            />
          </div>

          {active && <NowPlaying active={active} elapsed={elapsed} project={project} />}

          <BigTimeline stats={stats} projectMap={projects} />

          <div style={{ display: "flex", gap: 12 }}>
            <div style={{ flex: 1 }}>
              <ClaudeRecap stats={stats} />
            </div>
            <div style={{ width: 280 }}>
              <Donut stats={stats} />
            </div>
          </div>

          <div
            style={{
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: 0.4,
              color: C.text4,
              textTransform: "uppercase",
              padding: "4px 2px 0",
            }}
          >
            Sessions
          </div>
          <SessionsTable sessions={tableSessions} projectMap={projects} />
        </div>
      </div>
    </div>
  );
}

createRoot(document.getElementById("root")).render(<Dashboard />);
