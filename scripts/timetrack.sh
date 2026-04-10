#!/bin/bash
# Time tracker for Claude Code sessions
# Usage: timetrack.sh <start|stop|status|report|activity|sync-doc>

SESSIONS_FILE="$HOME/.timetrack/sessions.json"
PROJECTS_FILE="$HOME/.timetrack/projects.json"
CONFIG_FILE="$HOME/.timetrack/config.json"
ACTIVITY_FILE="$HOME/.timetrack/last_activity"
IDLE_MINUTES="${IDLE_MINUTES:-15}"

ensure_files() {
  [ -f "$SESSIONS_FILE" ] || echo '[]' > "$SESSIONS_FILE"
  [ -f "$PROJECTS_FILE" ] || echo '{"projects":[]}' > "$PROJECTS_FILE"
  [ -f "$CONFIG_FILE" ] || echo '{}' > "$CONFIG_FILE"
}

detect_project() {
  local cwd="${1:-$(pwd)}"
  python3 -c "
import json, sys
with open('$PROJECTS_FILE') as f:
    projects = json.load(f)['projects']
cwd = '''$cwd'''
for p in projects:
    if p['match'] in cwd:
        print(p['name'] + '|' + p.get('group', ''))
        sys.exit(0)
print('')
"
}

get_active_session() {
  python3 -c "
import json
with open('$SESSIONS_FILE') as f:
    sessions = json.load(f)
active = [s for s in sessions if s.get('stop') is None]
if active:
    s = active[-1]
    print(f\"{s['project']}|{s['start']}\")
else:
    print('')
"
}

start_timer() {
  ensure_files
  local result=$(detect_project "$1")
  local project=$(echo "$result" | cut -d'|' -f1)
  local group=$(echo "$result" | cut -d'|' -f2)

  if [ -z "$project" ]; then
    echo "ERROR: Not in a tracked project directory."
    echo "Current directory: ${1:-$(pwd)}"
    echo ""
    echo "Tracked projects:"
    python3 -c "
import json
with open('$PROJECTS_FILE') as f:
    for p in json.load(f)['projects']:
        g = p.get('group', '')
        label = f\" (group: {g})\" if g else ''
        print(f\"  - {p['name']}{label} (matches: {p['match']})\")"
    return 1
  fi

  # Check for already-running timer
  local active=$(get_active_session)
  if [ -n "$active" ]; then
    local active_project=$(echo "$active" | cut -d'|' -f1)
    local active_start=$(echo "$active" | cut -d'|' -f2)
    echo "Timer already running for '$active_project' since $active_start"
    echo "Run /stop-timer first to stop it."
    return 1
  fi

  local now=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

  python3 -c "
import json
with open('$SESSIONS_FILE', 'r') as f:
    sessions = json.load(f)
sessions.append({
    'project': '$project',
    'group': '$group',
    'start': '$now',
    'stop': None,
    'auto_stopped': False
})
with open('$SESSIONS_FILE', 'w') as f:
    json.dump(sessions, f, indent=2)
"

  # Set initial activity timestamp
  date +%s > "$ACTIVITY_FILE"

  local group_label=""
  [ -n "$group" ] && group_label=" ($group)"
  echo "STARTED timer for '$project'$group_label at $(date +"%I:%M %p")"
}

stop_timer() {
  ensure_files
  local active=$(get_active_session)

  if [ -z "$active" ]; then
    echo "No timer is currently running."
    return 1
  fi

  local auto_stopped="${1:-false}"
  local now=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

  python3 -c "
import json
from datetime import datetime, timezone

with open('$SESSIONS_FILE', 'r') as f:
    sessions = json.load(f)

for s in sessions:
    if s.get('stop') is None:
        s['stop'] = '$now'
        s['auto_stopped'] = $auto_stopped
        start = datetime.fromisoformat(s['start'].replace('Z', '+00:00'))
        stop = datetime.fromisoformat('$now'.replace('Z', '+00:00'))
        elapsed = stop - start
        hours = elapsed.total_seconds() / 3600
        mins = int(elapsed.total_seconds() / 60)

        auto_label = ' (auto-stopped due to idle)' if $auto_stopped else ''
        print(f\"STOPPED timer for '{s['project']}'{auto_label}\")
        print(f\"Session: {mins} minutes ({hours:.2f} hours)\")

with open('$SESSIONS_FILE', 'w') as f:
    json.dump(sessions, f, indent=2)
"

  # Auto-sync to Google Doc if URL is configured
  local has_url=$(python3 -c "
import json
try:
    with open('$CONFIG_FILE') as f:
        url = json.load(f).get('google_apps_script_url', '')
    print('yes' if url else 'no')
except:
    print('no')
" 2>/dev/null)

  if [ "$has_url" = "yes" ]; then
    sync_doc
  fi
}

check_idle() {
  ensure_files
  local active=$(get_active_session)

  if [ -z "$active" ]; then
    return 0
  fi

  if [ ! -f "$ACTIVITY_FILE" ]; then
    date +%s > "$ACTIVITY_FILE"
    return 0
  fi

  local last_activity=$(cat "$ACTIVITY_FILE")
  local now=$(date +%s)
  local idle_seconds=$(( now - last_activity ))
  local idle_limit=$(( IDLE_MINUTES * 60 ))

  if [ "$idle_seconds" -ge "$idle_limit" ]; then
    local stop_time=$(date -u -r "$last_activity" +"%Y-%m-%dT%H:%M:%SZ" 2>/dev/null || date -u +"%Y-%m-%dT%H:%M:%SZ")

    python3 -c "
import json
from datetime import datetime, timezone

with open('$SESSIONS_FILE', 'r') as f:
    sessions = json.load(f)

for s in sessions:
    if s.get('stop') is None:
        s['stop'] = '$stop_time'
        s['auto_stopped'] = True

with open('$SESSIONS_FILE', 'w') as f:
    json.dump(sessions, f, indent=2)
"
    echo "AUTO-STOPPED: Timer for '$(echo $active | cut -d'|' -f1)' stopped after ${IDLE_MINUTES}min idle."
  fi
}

record_activity() {
  date +%s > "$ACTIVITY_FILE"
}

status() {
  ensure_files
  local active=$(get_active_session)

  if [ -z "$active" ]; then
    echo "No timer running."
    return 0
  fi

  python3 -c "
from datetime import datetime, timezone

project = '$(echo $active | cut -d'|' -f1)'
start_str = '$(echo $active | cut -d'|' -f2)'
start = datetime.fromisoformat(start_str.replace('Z', '+00:00'))
now = datetime.now(timezone.utc)
elapsed = now - start
mins = int(elapsed.total_seconds() / 60)
hours = elapsed.total_seconds() / 3600
print(f\"Timer running: '{project}'\")
print(f\"Started: {start_str}\")
print(f\"Elapsed: {mins} minutes ({hours:.2f} hours)\")
"
}

report() {
  ensure_files
  local filter_project="$1"
  local filter_period="$2"

  python3 -c "
import json
from datetime import datetime, timezone, timedelta

with open('$SESSIONS_FILE') as f:
    sessions = json.load(f)
with open('$PROJECTS_FILE') as f:
    projects_config = json.load(f)['projects']

# Build group lookup
project_groups = {}
for p in projects_config:
    project_groups[p['name']] = p.get('group', '')

filter_project = '''$filter_project''' or None
filter_period = '''$filter_period''' or 'all'

now = datetime.now(timezone.utc)

if filter_period == 'today':
    cutoff = now.replace(hour=0, minute=0, second=0, microsecond=0)
elif filter_period == 'week':
    cutoff = now - timedelta(days=7)
elif filter_period == 'month':
    cutoff = now - timedelta(days=30)
else:
    cutoff = datetime.min.replace(tzinfo=timezone.utc)

# Organize: group -> project -> sessions
groups = {}

for s in sessions:
    if s.get('stop') is None:
        continue

    start = datetime.fromisoformat(s['start'].replace('Z', '+00:00'))
    stop = datetime.fromisoformat(s['stop'].replace('Z', '+00:00'))

    if start < cutoff:
        continue

    proj = s['project']
    if filter_project and proj != filter_project:
        continue

    group = s.get('group') or project_groups.get(proj, '') or 'Ungrouped'
    elapsed = (stop - start).total_seconds() / 3600

    if group not in groups:
        groups[group] = {}
    if proj not in groups[group]:
        groups[group][proj] = {'total': 0, 'sessions': []}

    groups[group][proj]['total'] += elapsed
    groups[group][proj]['sessions'].append({
        'date': start.strftime('%Y-%m-%d'),
        'start': start.strftime('%I:%M %p'),
        'stop': stop.strftime('%I:%M %p'),
        'hours': elapsed,
        'auto_stopped': s.get('auto_stopped', False)
    })

if not groups:
    print('No completed sessions found.')
else:
    period_label = {'today': 'Today', 'week': 'Last 7 days', 'month': 'Last 30 days', 'all': 'All time'}
    print(f\"TIME REPORT — {period_label.get(filter_period, 'All time')}\")
    print('=' * 55)

    grand_total = 0
    for group_name in sorted(groups.keys()):
        group_data = groups[group_name]
        group_total = sum(p['total'] for p in group_data.values())
        grand_total += group_total

        print(f\"\n## {group_name} — {group_total:.2f} hours total\")
        print('=' * 55)

        for proj in sorted(group_data.keys()):
            pdata = group_data[proj]
            count = len(pdata['sessions'])
            print(f\"\n  {proj}: {pdata['total']:.2f} hours ({count} sessions)\")
            print('  ' + '-' * 45)
            for sess in pdata['sessions']:
                auto = ' [auto-stopped]' if sess['auto_stopped'] else ''
                print(f\"    {sess['date']}  {sess['start']} — {sess['stop']}  ({sess['hours']:.2f}h){auto}\")

    if len(groups) > 1 or sum(len(g) for g in groups.values()) > 1:
        print(f\"\n{'=' * 55}\")
        print(f\"GRAND TOTAL: {grand_total:.2f} hours\")
"
}

sync_doc() {
  ensure_files
  local webapp_url=$(python3 -c "
import json
with open('$CONFIG_FILE') as f:
    print(json.load(f).get('google_apps_script_url', ''))
" 2>/dev/null)

  if [ -z "$webapp_url" ]; then
    echo "ERROR: No Google Apps Script URL configured."
    echo "Set it with: timetrack.sh set-url <YOUR_WEBAPP_URL>"
    return 1
  fi

  # Send all sessions as JSON payload
  python3 -c "
import json, urllib.request, urllib.error

with open('$SESSIONS_FILE') as f:
    sessions = json.load(f)
with open('$PROJECTS_FILE') as f:
    projects_config = json.load(f)['projects']

project_groups = {}
for p in projects_config:
    project_groups[p['name']] = p.get('group', '')

# Add group info to sessions that don't have it
for s in sessions:
    if not s.get('group'):
        s['group'] = project_groups.get(s.get('project', ''), '')

payload = json.dumps({'sessions': sessions}).encode('utf-8')
req = urllib.request.Request(
    '$webapp_url',
    data=payload,
    headers={'Content-Type': 'application/json'},
    method='POST'
)
try:
    resp = urllib.request.urlopen(req, timeout=30)
    result = json.loads(resp.read().decode('utf-8'))
    if result.get('status') == 'ok':
        print(f\"Synced to Google Doc: {result.get('docUrl', 'success')}\")
    else:
        print(f\"Sync error: {result}\")
except urllib.error.URLError as e:
    print(f\"Sync failed: {e}\")
"
}

set_url() {
  ensure_files
  local url="$1"
  python3 -c "
import json
with open('$CONFIG_FILE', 'r') as f:
    config = json.load(f)
config['google_apps_script_url'] = '$url'
with open('$CONFIG_FILE', 'w') as f:
    json.dump(config, f, indent=2)
print('Google Apps Script URL saved.')
"
}

case "$1" in
  start) start_timer "$2" ;;
  stop) stop_timer "False" ;;
  auto-stop) stop_timer "True" ;;
  idle-check) check_idle ;;
  activity) record_activity ;;
  status) status ;;
  report) report "$2" "$3" ;;
  sync-doc) sync_doc ;;
  set-url) set_url "$2" ;;
  *) echo "Usage: timetrack.sh <start|stop|status|report|activity|idle-check|sync-doc|set-url> [args]" ;;
esac
