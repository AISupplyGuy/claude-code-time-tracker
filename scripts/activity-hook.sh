#!/bin/bash
# PostToolUse / UserPromptSubmit hook: auto-start/switch timer based on file activity.
# Reads stdin (JSON from Claude Code hook input) and routes to a Python helper.

python3 "$HOME/.timetrack/activity-hook.py"
