import { useState, useEffect, useCallback } from "react";
import { buildProjectMap, formatElapsed } from "./data.js";

export function useTimetracker() {
  const [sessions, setSessions] = useState([]);
  const [projects, setProjects] = useState({});
  const [active, setActive] = useState(null);
  const [elapsed, setElapsed] = useState("0:00");

  const refresh = useCallback(async () => {
    const data = await window.timetracker.getData();
    setSessions(data.sessions || []);
    setActive(data.active || null);
    const projList = data.projects || [];
    setProjects(buildProjectMap(projList));
  }, []);

  useEffect(() => {
    refresh();
    window.timetracker.onDataUpdate((data) => {
      setSessions(data.sessions || []);
      setActive(data.active || null);
      if (data.projects?.length) {
        setProjects(buildProjectMap(data.projects));
      }
    });
  }, [refresh]);

  // Live timer
  useEffect(() => {
    if (!active) {
      setElapsed("0:00");
      return;
    }
    const tick = () => {
      const start = new Date(active.start).getTime();
      const secs = Math.floor((Date.now() - start) / 1000);
      setElapsed(formatElapsed(secs));
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [active]);

  const runCmd = useCallback(async (cmd) => {
    await window.timetracker.runCommand(cmd);
    setTimeout(refresh, 500);
  }, [refresh]);

  return { sessions, projects, active, elapsed, runCmd, refresh };
}
