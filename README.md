# Claude Code Time Tracker

Automatic, billable time tracking for [Claude Code](https://claude.com/claude-code) sessions. Detects which project you're working on by file activity, tracks hours, auto-stops on idle, and syncs to a Google Doc you can use as a billable timesheet.

**Zero commands required.** Open Claude Code, work on a project, walk away — your hours are tracked.

## How it works

1. You install the package — adds scripts, skills, and hooks to your Claude Code config.
2. You define your projects (directory match strings + display names).
3. When Claude Code touches a file inside a tracked project directory, a timer auto-starts.
4. Every prompt and tool call updates your "last activity" timestamp.
5. After 15 minutes of idle, the timer auto-stops at the moment you went idle (so coffee breaks don't get billed).
6. When you close the Claude Code session, the timer stops and syncs to your Google Doc.

The Google Doc is organized by **group → project → session**, with hours per project, totals per group, and a grand total.

## Requirements

- macOS or Linux
- Python 3 (preinstalled on macOS)
- Claude Code already installed
- (Optional) A Google account for the Google Doc sync

## Install

```bash
git clone https://github.com/AISupplyGuy/claude-code-time-tracker.git
cd claude-code-time-tracker
./install.sh
```

The installer will:
1. Copy scripts to `~/.timetrack/`
2. Install four skills (`/start-timer`, `/stop-timer`, `/time-report`, `/sync-timesheet`)
3. Add hooks to `~/.claude/settings.json` (preserving any hooks you already have)
4. Walk you through configuring your projects

After installing, **restart any open Claude Code sessions** so the new hooks take effect.

## Configuring projects

Projects live in `~/.timetrack/projects.json`. The installer creates this for you interactively, but you can edit it any time.

Each project has four fields. **Most are simple — read this section once and you'll know what to put.**

| Field | Required | What to put |
|---|---|---|
| `name` | yes | What you want this project called in your reports and Google Doc. Anything readable: "Acme Website", "Personal Blog", "ClientCo Mobile App". |
| `match` | yes | A unique word from the project's folder path. Usually just the repo folder name. See below. |
| `group` | no | A label that bundles related projects together — usually a client name. Skip if you don't need it. |
| `rate` | no | Your hourly rate as a number (e.g. `150`). Reserved for a future feature; not used in the doc yet. |

### How to figure out what `match` should be

`match` is how the time tracker knows which project you're working on. It looks at the file path of every file Claude Code touches and checks if the `match` text appears anywhere in that path.

**Example:** Say your project lives at `/Users/yourname/code/acme-website/src/index.ts`. When Claude Code reads or edits any file in that folder, the path will contain `acme-website`. So your `match` should be `acme-website`.

**The simplest rule:** open Finder or your terminal, find the folder where your project lives, and copy its folder name. That's your `match` value.

**Tips for picking a good match:**
- Use the project's folder name — usually it's already unique
- Don't use generic words like `src`, `app`, `code`, or `projects` — those will match everything and confuse the tracker
- If two projects share part of their path (like `acme-frontend` and `acme-backend`), use the full folder name for each so they don't clash
- The match is case-sensitive

### How to figure out what `group` should be

Groups are completely optional — they just bundle related projects together in your timesheet. If you don't care about grouping, leave it blank.

When grouping is useful:
- **You bill multiple clients.** Use the client name as the group: `"group": "Acme Corp"`. All Acme projects show up together with a subtotal.
- **You want to separate work from personal.** Use `"group": "Work"` and `"group": "Personal"`.
- **You want to track by category.** Use `"group": "Active clients"` vs `"group": "Maintenance"`.

If you only have one client or don't care about subtotals, skip it. Your projects will just be listed together in the report.

### Example projects.json

```json
{
  "projects": [
    {
      "name": "Acme Website",
      "match": "acme-website",
      "group": "Acme Corp",
      "rate": 150
    },
    {
      "name": "Acme Internal Tool",
      "match": "acme-internal-tool",
      "group": "Acme Corp",
      "rate": 150
    },
    {
      "name": "Personal Blog",
      "match": "my-blog",
      "rate": null
    }
  ]
}
```

In this example, the tracker would group both Acme projects together with a subtotal, and show "Personal Blog" separately.

### Don't know your folder name?

Open a terminal and run:

```bash
ls ~/code           # or wherever you keep your projects
```

Each line is a folder name you can use as a `match` value. Or, if a project is already open in your code editor, look at the path in the title bar — the last folder before your file is usually the right name.

## Google Doc sync setup

This pushes your time data to a Google Doc you control. One-time setup, then every `/stop-timer` (manual or automatic) updates the doc.

### Step 1 — Create the Apps Script

1. Go to [script.google.com](https://script.google.com) and click **New project**.
2. Delete the default code in `Code.gs`.
3. Open `google-apps-script/Code.gs` in this repo and copy the entire contents.
4. Paste into the empty `Code.gs` in Apps Script.
5. Click the floppy-disk icon (or Cmd/Ctrl+S) to save.

### Step 2 — Deploy as a Web App

1. Click **Deploy → New deployment**.
2. Click the gear icon next to "Select type" and choose **Web app**.
3. Set:
   - **Execute as:** Me (your-email@gmail.com)
   - **Who has access:** Anyone
4. Click **Deploy**.
5. Click **Authorize access**, pick your Google account.
6. You may see "Google hasn't verified this app." Click **Advanced → Go to (project name) (unsafe)**. (This is the standard warning for any unverified personal Apps Script — you wrote it, so you can trust it.)
7. Click **Allow**.
8. Copy the **Web app URL** that Apps Script gives you. It looks like:
   ```
   https://script.google.com/macros/s/AKfycbz.../exec
   ```

### Step 3 — Save the URL locally

```bash
bash ~/.timetrack/timetrack.sh set-url "PASTE_YOUR_URL_HERE"
```

### Step 4 — Test the sync

```bash
bash ~/.timetrack/timetrack.sh sync-doc
```

If everything is wired correctly, it'll print the Google Doc URL. Open that doc — it'll be titled **"Claude Code Time Tracking"** and live in your Google Drive.

Every `/stop-timer` from now on will rewrite that doc with the latest data.

## Daily usage

You shouldn't have to type anything. Just open Claude Code in or near a project, do your work, close the session.

But if you want manual control, the skills are:

| Skill | What it does |
|---|---|
| `/start-timer` | Manually start a timer for the current directory |
| `/stop-timer` | Stop the active timer and auto-sync to the Google Doc |
| `/time-report` | Print a report of all sessions, organized by group → project |
| `/sync-timesheet` | Push current data to the Google Doc without stopping the timer |

`/time-report` accepts optional filters:

```
/time-report                    # all time, all projects
/time-report week               # last 7 days
/time-report month              # last 30 days
/time-report "Acme Web App"     # only this project
/time-report "Acme Web App" week
```

### Activity classification

Each session is automatically tagged with what kind of work it was, based on the ratio of reads / edits / bash calls:

- **heavy editing** — 30%+ of activity was Edit/Write (real coding)
- **investigation** — 80%+ reads, zero edits (debugging or exploring)
- **tooling** — 40%+ Bash (npm test, git, deploy commands)
- **mixed** — none of the above

The report shows a per-session breakdown like `[12r/8e/3b]` (12 reads, 8 edits, 3 bash) so you can see at a glance what each session looked like:

```
Sales Trainer: 2.30 hours (4 sessions) — heavy editing
  ---------------------------------------------
    2026-04-10  09:14 AM — 11:32 AM  (2.30h)  [47r/22e/8b]
```

This lets you flag investigation-heavy sessions for review (was that real debugging or wandering?) without forcing the system to make billing decisions for you.

## Configuration

### Idle timeout

Default is 15 minutes. To change it, set `IDLE_MINUTES` in your shell:

```bash
export IDLE_MINUTES=20  # 20 min instead of 15
```

Or edit `~/.timetrack/activity-hook.sh` and change the `IDLE_MINUTES` constant.

### Adding a project later

Just edit `~/.timetrack/projects.json` and add a new entry. No restart needed — the hook reads the file every time.

### Removing the time tracker

```bash
# Remove scripts and data
rm -rf ~/.timetrack

# Remove skills
rm -rf ~/.claude/skills/{start-timer,stop-timer,time-report,sync-timesheet}

# Manually remove hook entries from ~/.claude/settings.json
```

## File layout

```
~/.timetrack/
├── timetrack.sh          # Main script
├── activity-hook.sh      # PostToolUse + UserPromptSubmit wrapper
├── activity-hook.py      # Activity hook logic (project detection, idle, switching)
├── auto-start-hook.sh    # SessionStart hook (cwd-based detection)
├── auto-stop-hook.sh     # SessionEnd hook
├── sessions.json         # Your time data
├── projects.json         # Your project config
├── config.json           # Google Apps Script URL
├── last_activity         # Last activity timestamp (for idle detection)
└── hook-debug.log        # Debug log (set TIMETRACK_DEBUG=0 to disable)

~/.claude/skills/
├── start-timer/SKILL.md
├── stop-timer/SKILL.md
├── time-report/SKILL.md
└── sync-timesheet/SKILL.md
```

## How the hooks work

The installer adds four hook entries to `~/.claude/settings.json`:

| Hook event | Script | What it does |
|---|---|---|
| `PostToolUse` | `activity-hook.sh` | After every tool call, checks if a file path in a tracked project was touched and starts/switches the timer. Also checks for idle. |
| `UserPromptSubmit` | `activity-hook.sh` | Same logic — runs every time you submit a prompt. |
| `SessionStart` | `auto-start-hook.sh` | If Claude Code starts inside a tracked directory, immediately starts a timer. |
| `SessionEnd` | `auto-stop-hook.sh` | When the session ends, stops the timer and auto-syncs to the doc. |

**Project switching:** If you Read a file in project A, then Read a file in project B, the timer **stays on A** (Read is gentle). But if you Edit/Write a file in project B, the timer **switches** to B. This avoids thrashing during exploration but accurately tracks actual work.

## Troubleshooting

### "No timer running" but I've been working

- Did you Read or Edit a file inside one of your tracked project directories? The hook only starts when a tool call touches a file path matching a project.
- Check that your project's `match` string actually appears in the file path: `bash ~/.timetrack/timetrack.sh status`
- Restart your Claude Code session if you just installed the hooks.

### Sync to Google Doc fails

- Re-check the Web app URL: `cat ~/.timetrack/config.json`
- Re-deploy the Apps Script if you changed any code (Apps Script requires a new deployment for code changes to take effect via the same URL).
- Make sure the Apps Script is set to **Execute as: Me** and **Who has access: Anyone**.

### Hooks aren't firing

- Confirm they're in your settings: `cat ~/.claude/settings.json`
- **Restart Claude Code** — it caches hooks at session start. Any session opened *before* you ran `install.sh` won't have the hooks loaded.
- Check the hook scripts are executable: `ls -la ~/.timetrack/*.sh ~/.timetrack/*.py`
- Check the debug log: `tail ~/.timetrack/hook-debug.log` — every hook invocation is logged here. If the file is empty or stale, the hook isn't being called by Claude Code.
- To turn off debug logging once everything's working: `export TIMETRACK_DEBUG=0` in your shell profile.

## Privacy

- All data stays local in `~/.timetrack/sessions.json`.
- The Google Doc is in **your** Google Drive — no third party.
- The Apps Script runs as **you**, so it only has access to your own Google Drive.
- The Web app URL is the only thing that touches the network, and it only sends your session JSON.

## License

MIT
