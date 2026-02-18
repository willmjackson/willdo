# WillDo

A local-first todo app for macOS, built to replace Todoist. Natural language task entry, recurring tasks, drag-to-reorder, dock badge, and a menu bar icon.

![Electron](https://img.shields.io/badge/Electron-40-47848F?logo=electron&logoColor=white)
![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)
![SQLite](https://img.shields.io/badge/SQLite-local-003B57?logo=sqlite&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)

<p align="center">
  <img src="resources/screenshot.png" alt="WillDo app screenshot" width="480" />
</p>

## Features

- **Natural language input** — type "File taxes by April 15 every quarter" and it parses the title, date, and recurrence
- **Recurring tasks** — daily, weekly, monthly, quarterly, yearly with automatic next-date computation
- **Drag-to-reorder** — fractional indexing for smooth reordering
- **Two views** — Inbox (all tasks, no-date first for triage) and Today (due today + overdue)
- **Dock badge** — shows count of tasks due today
- **Menu bar icon** — quick glance at due tasks from the system tray
- **Task editing** — calendar date picker, recurrence presets, inline title editing
- **Color-coded recurrence** — different colors for daily, weekly, monthly, quarterly, yearly
- **CSV import** — import tasks from Todoist CSV exports
- **Claude Code skill** — query and manage tasks from the terminal with `/todo`

## Tech Stack

- **Electron** via electron-vite (React + TypeScript + Vite)
- **better-sqlite3** — local SQLite database in the main process, IPC bridge to renderer
- **chrono-node** — natural language date parsing
- **rrule.js** — RFC 5545 recurrence rule computation
- **@dnd-kit** — drag-to-reorder with sortable contexts
- **Tailwind CSS v4** — "Golden Hour" warm theme

## Getting Started

```bash
# Install dependencies
pnpm install

# Run in development mode with HMR
pnpm dev

# Run tests
pnpm test

# Build for production
pnpm build

# Package as macOS .dmg
pnpm package
```

## Database

SQLite database stored at `~/Library/Application Support/willdo/willdo.db`. Tables:

- **tasks** — id, title, due_date, rrule, rrule_human, is_recurring, is_completed, sort_order
- **completions** — logs each task completion with timestamp and due_date snapshot
- **settings** — key/value store

## Claude Code Skill

To enable the `/todo` skill, symlink it into your Claude Code skills directory:

```bash
ln -s $(pwd)/skill/willdo-todo ~/.claude/skills/willdo-todo
```

Then use `/todo` from Claude Code to manage tasks without opening the app:

```
/todo              # list tasks due today
/todo list         # list all tasks
/todo add Buy milk tomorrow
/todo done milk
/todo search taxes
```

## Built With

Built entirely with [Claude Code](https://claude.ai/claude-code) in a single session.
