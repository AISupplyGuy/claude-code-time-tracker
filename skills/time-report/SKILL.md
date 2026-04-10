---
name: time-report
description: Show a summary of tracked billable hours per project. Optionally filter by project or time period.
user_invocable: true
---

# Time Report

When invoked, run this command with optional arguments:

```bash
bash ~/.timetrack/timetrack.sh report "" "all"
```

If the user specifies a project name, pass it as the first argument. If the user specifies a time period (today, week, month, all), pass it as the second argument. Examples:

- `/time-report` → `bash ~/.timetrack/timetrack.sh report "" "all"`
- `/time-report <project-name>` → `bash ~/.timetrack/timetrack.sh report "<project-name>" "all"`
- `/time-report week` → `bash ~/.timetrack/timetrack.sh report "" "week"`
- `/time-report <project-name> week` → `bash ~/.timetrack/timetrack.sh report "<project-name>" "week"`

Report the output to the user as-is. Do NOT add any extra commentary.
