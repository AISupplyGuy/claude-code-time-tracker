#!/bin/bash
# Claude Code Time Tracker — installer
# Sets up scripts, skills, hooks, and walks you through project configuration.

set -e

REPO_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
TIMETRACK_DIR="$HOME/.timetrack"
CLAUDE_DIR="$HOME/.claude"
SKILLS_DIR="$CLAUDE_DIR/skills"
SETTINGS_FILE="$CLAUDE_DIR/settings.json"

echo ""
echo "================================================"
echo "  Claude Code Time Tracker — Installer"
echo "================================================"
echo ""

# === Check prerequisites ===
if ! command -v python3 &> /dev/null; then
  echo "ERROR: python3 is required but not found."
  exit 1
fi

if [ ! -d "$CLAUDE_DIR" ]; then
  echo "ERROR: Claude Code config directory not found at $CLAUDE_DIR"
  echo "Make sure Claude Code is installed first."
  exit 1
fi

# === Step 1: Create directories ===
echo "[1/6] Creating directories..."
mkdir -p "$TIMETRACK_DIR"
mkdir -p "$SKILLS_DIR"

# === Step 2: Copy scripts ===
echo "[2/6] Installing scripts to $TIMETRACK_DIR..."
cp "$REPO_DIR/scripts/timetrack.sh" "$TIMETRACK_DIR/"
cp "$REPO_DIR/scripts/activity-hook.sh" "$TIMETRACK_DIR/"
cp "$REPO_DIR/scripts/activity-hook.py" "$TIMETRACK_DIR/"
cp "$REPO_DIR/scripts/auto-start-hook.sh" "$TIMETRACK_DIR/"
cp "$REPO_DIR/scripts/auto-stop-hook.sh" "$TIMETRACK_DIR/"
chmod +x "$TIMETRACK_DIR"/*.sh "$TIMETRACK_DIR"/*.py

# === Step 3: Initialize data files (only if missing) ===
echo "[3/6] Initializing data files..."
[ -f "$TIMETRACK_DIR/sessions.json" ] || echo '[]' > "$TIMETRACK_DIR/sessions.json"
[ -f "$TIMETRACK_DIR/config.json" ] || echo '{}' > "$TIMETRACK_DIR/config.json"

# === Step 4: Install skills ===
echo "[4/6] Installing skills to $SKILLS_DIR..."
for skill in start-timer stop-timer time-report sync-timesheet; do
  mkdir -p "$SKILLS_DIR/$skill"
  cp "$REPO_DIR/skills/$skill/SKILL.md" "$SKILLS_DIR/$skill/"
done

# === Step 5: Wire hooks into settings.json ===
echo "[5/6] Wiring hooks into Claude Code settings..."

if [ ! -f "$SETTINGS_FILE" ]; then
  echo '{}' > "$SETTINGS_FILE"
fi

python3 <<PYEOF
import json
import os

settings_file = "$SETTINGS_FILE"
with open(settings_file) as f:
    settings = json.load(f)

if 'hooks' not in settings:
    settings['hooks'] = {}

hooks_to_add = {
    'PostToolUse': {
        'matcher': '*',
        'command': 'bash ~/.timetrack/activity-hook.sh'
    },
    'UserPromptSubmit': {
        'command': 'bash ~/.timetrack/activity-hook.sh'
    },
    'SessionStart': {
        'command': 'bash ~/.timetrack/auto-start-hook.sh'
    },
    'SessionEnd': {
        'command': 'bash ~/.timetrack/auto-stop-hook.sh'
    }
}

for event, spec in hooks_to_add.items():
    cmd = spec['command']
    matcher = spec.get('matcher')

    if event not in settings['hooks']:
        settings['hooks'][event] = []

    # Find or create a hook block (with matching matcher if needed)
    target_block = None
    for block in settings['hooks'][event]:
        if matcher is None or block.get('matcher') == matcher:
            target_block = block
            break

    if target_block is None:
        target_block = {}
        if matcher is not None:
            target_block['matcher'] = matcher
        target_block['hooks'] = []
        settings['hooks'][event].append(target_block)

    if 'hooks' not in target_block:
        target_block['hooks'] = []

    # Skip if our hook already exists
    already_present = any(
        h.get('command') == cmd
        for h in target_block['hooks']
    )
    if not already_present:
        target_block['hooks'].append({
            'type': 'command',
            'command': cmd
        })

with open(settings_file, 'w') as f:
    json.dump(settings, f, indent=2)

print("  Hooks added to settings.json")
PYEOF

# === Step 6: Project configuration ===
echo "[6/6] Project configuration..."
echo ""

if [ -f "$TIMETRACK_DIR/projects.json" ]; then
  echo "  Existing projects.json found — leaving it alone."
  echo "  Edit $TIMETRACK_DIR/projects.json to add or change projects."
else
  echo "  Let's set up your projects."
  echo ""
  echo "  For each project, you'll provide:"
  echo "    - A display name (e.g., 'My Web App')"
  echo "    - A directory match string (a unique substring of the project's path)"
  echo "    - An optional group name (e.g., a client name to bundle projects under)"
  echo ""
  read -p "  How many projects do you want to track? " count

  python3 <<PYEOF
import json

count = int("$count")
projects = []

for i in range(count):
    print(f"\n  Project {i+1}:")
    name = input("    Display name: ").strip()
    match = input("    Directory match string (substring of project path): ").strip()
    group = input("    Group (optional, press enter to skip): ").strip()

    project = {
        "name": name,
        "match": match,
        "rate": None
    }
    if group:
        project["group"] = group
    projects.append(project)

with open("$TIMETRACK_DIR/projects.json", "w") as f:
    json.dump({"projects": projects}, f, indent=2)

print(f"\n  Saved {len(projects)} projects to $TIMETRACK_DIR/projects.json")
PYEOF
fi

echo ""
echo "================================================"
echo "  Installation complete!"
echo "================================================"
echo ""
echo "What's installed:"
echo "  - Scripts:  $TIMETRACK_DIR/"
echo "  - Skills:   $SKILLS_DIR/{start-timer,stop-timer,time-report,sync-timesheet}/"
echo "  - Hooks:    added to $SETTINGS_FILE"
echo "  - Projects: $TIMETRACK_DIR/projects.json"
echo ""
echo "Next steps:"
echo ""
echo "  1. Restart any open Claude Code sessions for hooks to take effect."
echo ""
echo "  2. Test it: Open Claude Code in one of your tracked project directories"
echo "     and read or edit any file. Then run:"
echo "       bash ~/.timetrack/timetrack.sh status"
echo ""
echo "  3. (Optional) Set up Google Doc sync — see README.md section"
echo "     'Google Doc sync setup'"
echo ""
echo "Skills you can use in Claude Code:"
echo "  /start-timer      Manually start a timer"
echo "  /stop-timer       Manually stop the active timer (auto-syncs to doc)"
echo "  /time-report      Show hours per project in the terminal"
echo "  /sync-timesheet   Push current data to your Google Doc"
echo ""
