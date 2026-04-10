#!/bin/bash
# Auto-starts a timer when a Claude Code session begins in a tracked directory.
# Reads the SessionStart JSON payload from stdin to get the cwd.

# Read JSON from stdin (timeout after 1 second to avoid hanging)
INPUT=$(cat 2>/dev/null)

# Extract cwd from JSON, fallback to $PWD
CWD=$(echo "$INPUT" | python3 -c "
import json, sys, os
try:
    data = json.load(sys.stdin)
    print(data.get('cwd', os.environ.get('PWD', '')))
except:
    print(os.environ.get('PWD', ''))
" 2>/dev/null)

if [ -z "$CWD" ]; then
  CWD="$PWD"
fi

# Try to start a timer for this directory
# Suppress output so it doesn't clutter the session start
bash ~/.timetrack/timetrack.sh start "$CWD" > /dev/null 2>&1

# Always exit 0 so we don't block session start
exit 0
