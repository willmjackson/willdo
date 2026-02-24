# WillDo

Local-first Electron todo app with natural language task entry, recurring tasks, drag-to-reorder, and macOS menu bar integration.

## Tech Stack

- Electron via electron-vite (React + TypeScript + Vite)
- better-sqlite3 — local SQLite database (main process, IPC to renderer)
- chrono-node — natural language date parsing
- rrule.js — RFC 5545 recurrence rules
- @dnd-kit — drag-to-reorder
- Tailwind CSS v4

## Package Manager

Always use pnpm.

## Project Structure

- `src/main/` — Electron main process (db, ipc, tray)
- `src/preload/` — contextBridge IPC bridge
- `src/renderer/src/` — React app (components, hooks, lib)
- `src/shared/types.ts` — Shared TypeScript types
- `packages/shared/` — Shared package (parser, recurrence, types) used by Electron app and PWA
- `pwa/` — Mobile PWA (React, deployed to GitHub Pages)
- `worker/` — Cloudflare Worker for cloud sync (D1 database)
- `skill/willdo-todo/SKILL.md` — Claude Code /todo skill

## Database

SQLite at `~/Library/Application Support/willdo/willdo.db`

Tables: tasks, completions, settings

## Development

```bash
pnpm dev        # Launch dev mode with HMR
pnpm build      # Production build
pnpm package    # Package as macOS .dmg
```

## Testing

The `packages/shared/` module uses extensionless TypeScript imports (resolved by Vite at build time). To run ad-hoc tests against it, use the workspace-installed `tsx`:

```bash
./node_modules/.bin/tsx -e "import { parseTaskInput } from './packages/shared/src/parser.ts'; ..."
```

When making changes to parsing, recurrence, or other shared logic, always verify with a quick tsx script before committing. Test edge cases like:
- Recurring + time: `"Make pasta every friday at 3pm"`
- Recurring without time: `"Review every friday"`
- Non-recurring with date: `"Dentist next tuesday at 2pm"`
- Daily: `"Gym every day at 6pm"`

## Key Design Decisions

- Recurring tasks use single-task model: on completion, log to completions, compute next occurrence via rrule.js, update due_date
- Fractional indexing for sort_order (inserting between 3.0 and 4.0 → 3.5)
- rrule_human stores original text since reconstructing from RRULE is lossy
- Close button hides to tray (macOS convention)
- Title bar uses hiddenInset style with traffic light repositioning
