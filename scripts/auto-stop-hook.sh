#!/bin/bash
# Auto-stops the active timer when a Claude Code session ends.
# Also auto-syncs to Google Doc.

bash ~/.timetrack/timetrack.sh stop > /dev/null 2>&1

exit 0
