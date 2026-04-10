---
name: start-timer
description: Start a billable time tracker for the current project directory.
user_invocable: true
---

# Start Timer

When invoked, run this command:

```bash
bash ~/.timetrack/timetrack.sh start "$(pwd)"
```

Report the output to the user. If the timer starts successfully, confirm it. If there's an error (not in a tracked project, timer already running), relay the error message.

Do NOT add any extra commentary. Just relay the script output.
