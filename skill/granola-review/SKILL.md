---
name: granola
description: Pull action items from Granola meeting notes and create review tasks in WillDo
user_invocable: true
arguments: "time range"
---

# Granola Meeting Review

You are a skill that extracts action items from Granola meeting notes and creates them as review tasks in WillDo.

## Database

`~/Library/Application Support/willdo/willdo.db` (macOS built-in `sqlite3`, WAL mode)

**Important:** Always use quoted paths in all sqlite3 commands — never backslash-escape the space. Use:
```bash
sqlite3 "$HOME/Library/Application Support/willdo/willdo.db" "..."
```

## Invocation

The user runs `/granola [time range]`. Parse their intent:

| Input | Behaviour |
|---|---|
| `/granola` (no args) | Last 24 hours, or since `granola_last_pull` setting — whichever is more recent |
| `/granola today` | Today's meetings |
| `/granola this week` | This week's meetings |
| `/granola last week` | Last week's meetings |
| `/granola since <date>` | Custom start date (natural language → ISO) |

## Step-by-step Procedure

### 1. Determine time range

Check when the last pull happened:

```bash
sqlite3 "$HOME/Library/Application Support/willdo/willdo.db" \
  "SELECT value FROM settings WHERE key = 'granola_last_pull';"
```

Use the later of the last pull timestamp and the user's requested range. If no args and no last pull, default to last 24 hours.

### 2. Fetch meetings from Granola

First, use `mcp__granola__list_meetings` with the appropriate `time_range` parameter to get meeting IDs and metadata.

Then use `mcp__granola__get_meetings` to fetch the full notes for all meetings in the range.

Extract action items directly from the actual meeting notes yourself. **Do not use `query_granola_meetings`** — it can hallucinate action items that don't exist in the notes. By reading the raw notes, you ensure every action item has a real source.

For each meeting, look for:
- Explicit action items sections
- "Will: ..." or "Will to ..." patterns
- Follow-up commitments Will made
- Scheduling tasks Will agreed to

### 3. Read the feedback log

Before creating tasks, read recent review feedback to learn the user's preferences:

```bash
sqlite3 "$HOME/Library/Application Support/willdo/willdo.db" \
  "SELECT action, original_title, final_title, meeting_title, dismiss_comment FROM review_feedback ORDER BY created_at DESC LIMIT 30;"
```

Study this feedback to calibrate your extraction:

- **Dismissed items** — learn what to skip. Check the `dismiss_comment` column for the user's reason (e.g. "assigned to someone else", "already done", "not actionable"). These reasons are the strongest signal for what to exclude in future extractions.
- **Dismissed without comment** — still useful as a weaker signal. Look for patterns in what gets dismissed silently.
- **Edited items** — learn the user's preferred title style. Compare `original_title` → `final_title` to see how titles get rewritten (e.g. shorter, more imperative, more specific).
- **Accepted items** — learn what good extraction looks like. These titles were good as-is.

Apply these patterns when writing task titles and deciding which items to include.

### 4. Extract and filter action items

From the Granola results, identify discrete action items. For each candidate:

**Include if:**
- Explicitly assigned to Will (e.g. "Will: do X", "Will to follow up on Y")
- Will is the clear owner based on context (e.g. a 1:1 where Will is the only Mote team member)
- It's a scheduling action Will needs to take (e.g. "Schedule follow-up for March 10th")

**Exclude if:**
- Assigned to someone else (e.g. "Billy: focus on content strategy")
- It's a team-wide observation with no specific owner
- A very similar task already exists in WillDo (check with the dedup query below)
- The feedback log shows a pattern of dismissing this type of item

**Title style:**
- Imperative voice ("Send pricing quote to Michelle", not "Will needs to send pricing quote")
- Concise — aim for under 60 characters
- Include the key person/topic for context ("Follow up with Nicole re: translation budget")
- If the feedback log shows a consistent editing pattern, adopt that style

**Due dates:**
- If the meeting notes mention a specific date, use it (ISO format YYYY-MM-DD)
- If they mention a relative timeframe ("next week", "by Friday"), compute the date
- If no date is mentioned, leave `due_date` as NULL

### 5. Deduplicate

Before inserting each task, check for existing tasks with overlapping content:

```bash
sqlite3 "$HOME/Library/Application Support/willdo/willdo.db" \
  "SELECT id, title, context FROM tasks WHERE is_completed = 0 AND (title LIKE '%<keyword>%' OR context LIKE '%<meeting_id>%');"
```

Use 1-2 distinctive keywords from the task title. Skip insertion if a matching task already exists.

### 6. Insert review tasks

For each action item, insert a task with `status = 'review'` and a JSON `context` blob:

```bash
sqlite3 "$HOME/Library/Application Support/willdo/willdo.db" \
  "INSERT INTO tasks (id, title, due_date, is_recurring, sort_order, status, context)
   VALUES (
     lower(hex(randomblob(8))),
     '<title>',
     <due_date or NULL>,
     0,
     (SELECT COALESCE(MAX(sort_order), 0) + 1 FROM tasks),
     'review',
     json('<context_json>')
   );"
```

The `context` JSON must have this exact shape:

```json
{
  "source": "granola",
  "meeting_id": "<uuid from Granola>",
  "meeting_title": "<meeting title>",
  "meeting_date": "<YYYY-MM-DD>",
  "meeting_url": "https://notes.granola.ai/d/<meeting_id>",
  "participants": ["Name1", "Name2"],
  "source_text": "<exact action item text from the notes>"
}
```

**Important:** When inserting JSON into sqlite3, escape single quotes by doubling them (`''`). Use `json()` to validate the JSON.

### 7. Update last-pull timestamp

```bash
sqlite3 "$HOME/Library/Application Support/willdo/willdo.db" \
  "INSERT OR REPLACE INTO settings (key, value) VALUES ('granola_last_pull', datetime('now'));"
```

### 8. Report results

Display a concise summary:

```
Reviewed 5 meetings since Feb 24

Created 3 review tasks:
  + Send pricing quotes to Katie (from: Katie Leon meeting, Feb 25)
  + Follow up with Nicole re translation budget (from: Middletown pilot, Feb 25)
  + Confirm FETC session participation (from: Dusty meeting, Feb 24)

Skipped 4 items (assigned to others)
Skipped 1 item (already exists)

Open WillDo to review and accept these tasks.
```

## Schema Bootstrap

Before inserting, verify the required columns and table exist. Run these idempotent statements at the start of every invocation:

```bash
sqlite3 "$HOME/Library/Application Support/willdo/willdo.db" "
  ALTER TABLE tasks ADD COLUMN status TEXT DEFAULT 'active';
" 2>/dev/null
sqlite3 "$HOME/Library/Application Support/willdo/willdo.db" "
  ALTER TABLE tasks ADD COLUMN context TEXT;
" 2>/dev/null
sqlite3 "$HOME/Library/Application Support/willdo/willdo.db" "
  CREATE TABLE IF NOT EXISTS review_feedback (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(8)))),
    task_id TEXT NOT NULL, action TEXT NOT NULL,
    original_title TEXT, final_title TEXT,
    meeting_title TEXT, meeting_id TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );
"
```

```bash
sqlite3 "$HOME/Library/Application Support/willdo/willdo.db" "
  ALTER TABLE review_feedback ADD COLUMN dismiss_comment TEXT;
" 2>/dev/null
```

These are no-ops if the columns/table already exist.

## Notes

- All queries use macOS built-in `sqlite3` — no extra dependencies
- Task IDs are 16-char hex strings: `lower(hex(randomblob(8)))`
- `sort_order` is a REAL — use `MAX(sort_order) + 1` for new tasks
- The Granola MCP tools are available as `mcp__granola__list_meetings`, `mcp__granola__get_meetings`, `mcp__granola__get_meeting_transcript`
- Do NOT use `query_granola_meetings` — it can hallucinate action items. Always extract from raw meeting notes via `get_meetings`.
