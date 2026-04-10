#!/usr/bin/env python3
"""
Activity hook for Claude Code time tracker.
Reads hook JSON from stdin, detects which project (if any) was touched,
and starts/switches/stops timers accordingly.
"""

import json
import sys
import os
import re
from datetime import datetime, timezone

HOME = os.environ.get('HOME', '')
TIMETRACK_DIR = f'{HOME}/.timetrack'
SESSIONS_FILE = f'{TIMETRACK_DIR}/sessions.json'
PROJECTS_FILE = f'{TIMETRACK_DIR}/projects.json'
ACTIVITY_FILE = f'{TIMETRACK_DIR}/last_activity'
DEBUG_LOG = f'{TIMETRACK_DIR}/hook-debug.log'
IDLE_MINUTES = 15

DEBUG = os.environ.get('TIMETRACK_DEBUG', '1') == '1'


def debug(msg):
    if DEBUG:
        try:
            with open(DEBUG_LOG, 'a') as f:
                f.write(f"[{datetime.now().isoformat()}] {msg}\n")
        except Exception:
            pass


def load_json(path, default):
    try:
        with open(path) as f:
            return json.load(f)
    except Exception as e:
        debug(f"load_json failed for {path}: {e}")
        return default


def save_json(path, data):
    with open(path, 'w') as f:
        json.dump(data, f, indent=2)


def main():
    try:
        raw = sys.stdin.read()
    except Exception as e:
        debug(f"failed to read stdin: {e}")
        return

    if not raw.strip():
        debug("empty stdin, exiting")
        return

    try:
        data = json.loads(raw)
    except Exception as e:
        debug(f"failed to parse stdin JSON: {e}; raw[:200]={raw[:200]}")
        return

    debug(f"hook fired; keys={list(data.keys())}")

    tool_name = data.get('tool_name', data.get('tool', ''))
    tool_input = data.get('tool_input', {}) or {}

    file_path = ''
    for key in ('file_path', 'path', 'notebook_path'):
        v = tool_input.get(key)
        if v:
            file_path = v
            break

    if not file_path and tool_name == 'Bash':
        cmd = tool_input.get('command', '') or ''
        m = re.search(r'/Users/[^\s"\'`]+', cmd)
        if m:
            file_path = m.group(0)

    if not file_path and tool_name == 'Grep':
        v = tool_input.get('path')
        if v:
            file_path = v

    debug(f"tool={tool_name} file_path={file_path}")

    projects = load_json(PROJECTS_FILE, {'projects': []}).get('projects', [])
    sessions = load_json(SESSIONS_FILE, [])

    active = None
    for s in sessions:
        if s.get('stop') is None:
            active = s

    now_ts = int(datetime.now().timestamp())
    now_iso = datetime.now(timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ')

    # Idle auto-stop
    if active and os.path.exists(ACTIVITY_FILE):
        try:
            with open(ACTIVITY_FILE) as f:
                last = int(f.read().strip())
            if now_ts - last >= IDLE_MINUTES * 60:
                stop_iso = datetime.utcfromtimestamp(last).strftime('%Y-%m-%dT%H:%M:%SZ')
                active['stop'] = stop_iso
                active['auto_stopped'] = True
                save_json(SESSIONS_FILE, sessions)
                debug(f"auto-stopped {active['project']} due to idle")
                active = None
        except Exception as e:
            debug(f"idle check failed: {e}")

    # Match path against tracked projects
    matched_project = None
    matched_group = ''
    if file_path:
        for p in projects:
            if p.get('match') and p['match'] in file_path:
                matched_project = p['name']
                matched_group = p.get('group', '')
                break

    debug(f"matched_project={matched_project} active={active['project'] if active else None}")

    should_start = False
    should_stop_first = False

    if matched_project:
        if active is None:
            should_start = True
        elif active.get('project') != matched_project:
            if tool_name in ('Edit', 'Write', 'NotebookEdit'):
                should_stop_first = True
                should_start = True

    if should_stop_first and active:
        active['stop'] = now_iso
        active['auto_stopped'] = False
        active = None

    if should_start:
        sessions.append({
            'project': matched_project,
            'group': matched_group,
            'start': now_iso,
            'stop': None,
            'auto_stopped': False
        })
        save_json(SESSIONS_FILE, sessions)
        debug(f"STARTED timer for {matched_project}")

    final_sessions = load_json(SESSIONS_FILE, [])
    has_active = any(s.get('stop') is None for s in final_sessions)
    if has_active:
        try:
            with open(ACTIVITY_FILE, 'w') as f:
                f.write(str(now_ts))
        except Exception as e:
            debug(f"failed to write activity file: {e}")


if __name__ == '__main__':
    try:
        main()
    except Exception as e:
        debug(f"unhandled exception: {e}")
    sys.exit(0)
