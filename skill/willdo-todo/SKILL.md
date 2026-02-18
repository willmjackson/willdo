---
name: todo
description: Query and manage WillDo tasks from the terminal
user_invocable: true
arguments: "[command] [args...]"
---

# WillDo Task Manager

You are a skill that manages tasks in the WillDo local SQLite database.

## Database Location

`~/Library/Application Support/willdo/willdo.db`

## Commands

The user will invoke you as `/todo [command] [args...]`. Parse their intent and run the appropriate sqlite3 query.

### `today` or no args — List tasks due today

```bash
sqlite3 ~/Library/Application\ Support/willdo/willdo.db \
  "SELECT id, title, due_date, rrule_human FROM tasks WHERE is_completed = 0 AND due_date IS NOT NULL AND due_date <= date('now') ORDER BY due_date ASC, sort_order ASC;"
```

Display results as a formatted list:
- Overdue tasks marked with [OVERDUE]
- Today's tasks shown normally
- Include recurrence info if present

### `list` or `all` — List all incomplete tasks

```bash
sqlite3 ~/Library/Application\ Support/willdo/willdo.db \
  "SELECT id, title, due_date, rrule_human FROM tasks WHERE is_completed = 0 ORDER BY sort_order ASC;"
```

### `add <natural language>` — Add a new task

Parse the natural language input to extract:
- **Title**: the main task text
- **Due date**: dates like "tomorrow", "next Friday", "April 15" → ISO format (YYYY-MM-DD)
- **Recurrence**: patterns like "every week", "every Friday", "daily" → RRULE format

Then insert:
```bash
sqlite3 ~/Library/Application\ Support/willdo/willdo.db \
  "INSERT INTO tasks (id, title, due_date, rrule, rrule_human, is_recurring, sort_order) VALUES (lower(hex(randomblob(8))), '<title>', '<due_date or NULL>', '<rrule or NULL>', '<rrule_human or NULL>', <0 or 1>, (SELECT COALESCE(MAX(sort_order), 0) + 1 FROM tasks));"
```

### `done <search>` — Complete a task

Search for the task by title substring, then mark complete:
```bash
# Find the task
sqlite3 ~/Library/Application\ Support/willdo/willdo.db \
  "SELECT id, title FROM tasks WHERE is_completed = 0 AND title LIKE '%<search>%';"

# If recurring, compute next date and update; if not, mark completed
# For non-recurring:
sqlite3 ~/Library/Application\ Support/willdo/willdo.db \
  "UPDATE tasks SET is_completed = 1, updated_at = datetime('now') WHERE id = '<id>';"
```

If multiple matches, show them and ask the user which one.

### `search <query>` — Search tasks

```bash
sqlite3 ~/Library/Application\ Support/willdo/willdo.db \
  "SELECT id, title, due_date, rrule_human, CASE WHEN is_completed THEN '✓' ELSE ' ' END as status FROM tasks WHERE title LIKE '%<query>%' ORDER BY is_completed ASC, sort_order ASC;"
```

## Output Formatting

- Use a clean, readable format
- Show due dates relative to today (Today, Tomorrow, Overdue, etc.)
- Show recurrence patterns when present (e.g., "↻ every Friday")
- Keep output concise — this runs in a terminal

## Notes

- All queries use macOS built-in `sqlite3` — no extra dependencies needed
- The database uses WAL mode, so reads are safe even while the Electron app is running
- Task IDs are 16-char hex strings
- `sort_order` is a REAL for fractional indexing
