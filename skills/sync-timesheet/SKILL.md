---
name: sync-timesheet
description: Sync time tracking data to the Google Doc timesheet.
user_invocable: true
---

# Sync Timesheet

When invoked, run:

```bash
bash ~/.timetrack/timetrack.sh sync-doc
```

Report the output to the user. If it succeeds, confirm the sync and show the doc URL. If it fails (no URL configured), explain they need to set up the Google Apps Script first.

Do NOT add any extra commentary. Just relay the script output.
