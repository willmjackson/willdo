import Database from 'better-sqlite3'
import { app } from 'electron'
import path from 'path'
import type { Task, CreateTaskInput, UpdateTaskInput, Completion, CompletedTaskRow, CompletionStats, ReviewFeedback, ReviewAction } from '../shared/types'

let db: Database.Database

export function getDbPath(): string {
  return path.join(app.getPath('userData'), 'willdo.db')
}

export function initDb(): void {
  db = new Database(getDbPath())
  db.pragma('journal_mode = WAL')
  db.pragma('foreign_keys = ON')
  migrate()
}

function migrate(): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS tasks (
      id           TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(8)))),
      title        TEXT NOT NULL,
      due_date     TEXT,
      rrule        TEXT,
      rrule_human  TEXT,
      is_recurring INTEGER DEFAULT 0,
      is_completed INTEGER DEFAULT 0,
      sort_order   REAL NOT NULL,
      created_at   TEXT DEFAULT (datetime('now')),
      updated_at   TEXT DEFAULT (datetime('now')),
      todoist_id   TEXT
    );

    CREATE TABLE IF NOT EXISTS completions (
      id           TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(8)))),
      task_id      TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
      completed_at TEXT DEFAULT (datetime('now')),
      due_date     TEXT
    );

    CREATE TABLE IF NOT EXISTS settings (
      key   TEXT PRIMARY KEY,
      value TEXT
    );
  `)

  // Idempotent column additions
  try { db.exec('ALTER TABLE tasks ADD COLUMN claude_launched_at TEXT') } catch { /* already exists */ }
  try { db.exec('ALTER TABLE completions ADD COLUMN launched_with_claude INTEGER DEFAULT 0') } catch { /* already exists */ }
  try { db.exec('ALTER TABLE tasks ADD COLUMN due_time TEXT') } catch { /* already exists */ }
  try { db.exec("ALTER TABLE tasks ADD COLUMN status TEXT DEFAULT 'active'") } catch { /* already exists */ }
  try { db.exec('ALTER TABLE tasks ADD COLUMN context TEXT') } catch { /* already exists */ }

  // Review feedback table for learning loop
  db.exec(`
    CREATE TABLE IF NOT EXISTS review_feedback (
      id              TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(8)))),
      task_id         TEXT NOT NULL,
      action          TEXT NOT NULL,
      original_title  TEXT,
      final_title     TEXT,
      meeting_title   TEXT,
      meeting_id      TEXT,
      created_at      TEXT DEFAULT (datetime('now'))
    )
  `)
  try { db.exec('ALTER TABLE review_feedback ADD COLUMN dismiss_comment TEXT') } catch { /* already exists */ }
}

/**
 * Given an rrule string, compute the next occurrence on or after today.
 * Used to set the initial due_date for recurring tasks.
 * When `excludeDate` is provided, finds the next occurrence strictly after that date
 * (used when completing a recurring task to advance to the next one).
 */
export function computeNextOccurrence(rruleStr: string, fromDate?: string, excludeDate?: string): string | null {
  const { RRule } = require('rrule')
  const startDate = fromDate || new Date().toISOString().split('T')[0]
  const dtstart = startDate.replace(/-/g, '')

  const rule = RRule.fromString(`DTSTART:${dtstart}T000000Z\nRRULE:${rruleStr}`)

  // If we need to exclude a specific date (completion scenario), find strictly after it
  if (excludeDate) {
    const afterDate = new Date(excludeDate + 'T23:59:59Z')
    const next = rule.after(afterDate, false) // exclusive
    if (next) return next.toISOString().split('T')[0]
    return null
  }

  // Default: find next occurrence on or after today (for initial task creation)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const next = rule.after(new Date(today.getTime() - 1), true) // inclusive

  if (next) {
    return next.toISOString().split('T')[0]
  }
  return startDate
}

export function getNextSortOrder(): number {
  const row = db.prepare('SELECT MAX(sort_order) as max_order FROM tasks WHERE is_completed = 0').get() as { max_order: number | null }
  return (row.max_order ?? 0) + 1
}

export function listTasks(view: 'inbox' | 'today'): Task[] {
  const today = new Date().toISOString().split('T')[0]
  if (view === 'today') {
    return db.prepare(
      `SELECT * FROM tasks WHERE is_completed = 0 AND due_date IS NOT NULL AND due_date <= ?
       ORDER BY due_date ASC, sort_order ASC`
    ).all(today) as Task[]
  }
  // Inbox: no-date first (triage), then overdue, today, upcoming — sorted by date within groups
  return db.prepare(
    `SELECT * FROM tasks WHERE is_completed = 0
     ORDER BY
       CASE
         WHEN due_date IS NULL THEN 0
         WHEN due_date < ? THEN 1
         WHEN due_date = ? THEN 2
         ELSE 3
       END,
       due_date ASC,
       sort_order ASC`
  ).all(today, today) as Task[]
}

export function createTask(input: CreateTaskInput): Task {
  const sortOrder = getNextSortOrder()

  // For recurring tasks without an explicit date, compute the first occurrence
  let dueDate = input.due_date ?? null
  if (input.is_recurring && input.rrule && !dueDate) {
    dueDate = computeNextOccurrence(input.rrule)
  }

  const status = input.status ?? 'active'
  const context = input.context ?? null

  const stmt = input.id
    ? db.prepare(`
        INSERT INTO tasks (id, title, due_date, due_time, rrule, rrule_human, is_recurring, sort_order, status, context)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)
    : db.prepare(`
        INSERT INTO tasks (title, due_date, due_time, rrule, rrule_human, is_recurring, sort_order, status, context)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)
  const params = [
    ...(input.id ? [input.id] : []),
    input.title,
    dueDate,
    input.due_time ?? null,
    input.rrule ?? null,
    input.rrule_human ?? null,
    input.is_recurring ? 1 : 0,
    sortOrder,
    status,
    context
  ]
  const result = stmt.run(...params)
  return db.prepare('SELECT * FROM tasks WHERE rowid = ?').get(result.lastInsertRowid) as Task
}

export function updateTask(input: UpdateTaskInput): Task {
  const sets: string[] = []
  const values: unknown[] = []

  if (input.title !== undefined) {
    sets.push('title = ?')
    values.push(input.title)
  }
  if (input.due_date !== undefined) {
    sets.push('due_date = ?')
    values.push(input.due_date)
  }
  if (input.due_time !== undefined) {
    sets.push('due_time = ?')
    values.push(input.due_time)
  }
  if (input.rrule !== undefined) {
    sets.push('rrule = ?')
    values.push(input.rrule)
  }
  if (input.rrule_human !== undefined) {
    sets.push('rrule_human = ?')
    values.push(input.rrule_human)
  }
  if (input.is_recurring !== undefined) {
    sets.push('is_recurring = ?')
    values.push(input.is_recurring ? 1 : 0)
  }
  if (input.is_completed !== undefined) {
    sets.push('is_completed = ?')
    values.push(input.is_completed ? 1 : 0)
  }
  if (input.sort_order !== undefined) {
    sets.push('sort_order = ?')
    values.push(input.sort_order)
  }
  if (input.status !== undefined) {
    sets.push('status = ?')
    values.push(input.status)
  }
  if (input.context !== undefined) {
    sets.push('context = ?')
    values.push(input.context)
  }

  sets.push("updated_at = datetime('now')")
  values.push(input.id)

  db.prepare(`UPDATE tasks SET ${sets.join(', ')} WHERE id = ?`).run(...values)
  return db.prepare('SELECT * FROM tasks WHERE id = ?').get(input.id) as Task
}

export function markClaudeLaunched(id: string): void {
  db.prepare("UPDATE tasks SET claude_launched_at = datetime('now'), updated_at = datetime('now') WHERE id = ?").run(id)
}

export function completeTask(id: string): Task {
  const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(id) as Task | undefined
  if (!task) throw new Error(`Task not found: ${id}`)

  // Log completion, propagating Claude flag
  const launchedWithClaude = task.claude_launched_at ? 1 : 0
  db.prepare(`
    INSERT INTO completions (task_id, due_date, launched_with_claude) VALUES (?, ?, ?)
  `).run(id, task.due_date, launchedWithClaude)

  if (task.is_recurring && task.rrule) {
    // Find next occurrence strictly after the current due date
    const currentDue = task.due_date || new Date().toISOString().split('T')[0]
    const nextDate = computeNextOccurrence(task.rrule, currentDue, currentDue)

    if (nextDate) {
      // Reset claude_launched_at so recurring tasks start fresh each cycle; preserve due_time
      db.prepare("UPDATE tasks SET due_date = ?, claude_launched_at = NULL, updated_at = datetime('now') WHERE id = ?").run(nextDate, id)
    } else {
      db.prepare("UPDATE tasks SET is_completed = 1, claude_launched_at = NULL, updated_at = datetime('now') WHERE id = ?").run(id)
    }
  } else {
    db.prepare("UPDATE tasks SET is_completed = 1, claude_launched_at = NULL, updated_at = datetime('now') WHERE id = ?").run(id)
  }

  return db.prepare('SELECT * FROM tasks WHERE id = ?').get(id) as Task
}

export function listCompletedTasks(limit = 100): CompletedTaskRow[] {
  return db.prepare(`
    SELECT
      c.id          AS completion_id,
      c.task_id,
      t.title,
      c.completed_at,
      c.due_date,
      c.launched_with_claude,
      t.is_recurring,
      t.rrule_human
    FROM completions c
    JOIN tasks t ON t.id = c.task_id
    ORDER BY c.completed_at DESC
    LIMIT ?
  `).all(limit) as CompletedTaskRow[]
}

export function getCompletionStats(): CompletionStats {
  const row = db.prepare(`
    SELECT
      SUM(CASE WHEN date(completed_at) = date('now') THEN 1 ELSE 0 END)                       AS today,
      SUM(CASE WHEN completed_at >= datetime('now', 'weekday 0', '-7 days') THEN 1 ELSE 0 END) AS thisWeek,
      COUNT(*)                                                                                  AS total,
      SUM(launched_with_claude)                                                                 AS claudeAssisted
    FROM completions
  `).get() as { today: number; thisWeek: number; total: number; claudeAssisted: number }
  return {
    today: row.today ?? 0,
    thisWeek: row.thisWeek ?? 0,
    total: row.total ?? 0,
    claudeAssisted: row.claudeAssisted ?? 0
  }
}

export function deleteTask(id: string): void {
  db.prepare('DELETE FROM tasks WHERE id = ?').run(id)
}

export function reorderTask(id: string, newOrder: number): void {
  db.prepare("UPDATE tasks SET sort_order = ?, updated_at = datetime('now') WHERE id = ?").run(newOrder, id)
}

export function searchTasks(query: string): Task[] {
  return db.prepare(
    "SELECT * FROM tasks WHERE title LIKE ? AND is_completed = 0 ORDER BY sort_order ASC"
  ).all(`%${query}%`) as Task[]
}

export function getDueTodayCount(): number {
  const today = new Date().toISOString().split('T')[0]
  const row = db.prepare(
    'SELECT COUNT(*) as count FROM tasks WHERE is_completed = 0 AND due_date IS NOT NULL AND due_date <= ?'
  ).get(today) as { count: number }
  return row.count
}

export function getCompletions(taskId: string): Completion[] {
  return db.prepare(
    'SELECT * FROM completions WHERE task_id = ? ORDER BY completed_at DESC'
  ).all(taskId) as Completion[]
}

export function createTaskFromImport(input: CreateTaskInput & { todoist_id: string; sort_order: number }): Task {
  const existing = db.prepare('SELECT id FROM tasks WHERE todoist_id = ?').get(input.todoist_id)
  if (existing) throw new Error('duplicate')

  // For recurring tasks without an explicit date, compute the first occurrence
  let dueDate = input.due_date ?? null
  if (input.is_recurring && input.rrule && !dueDate) {
    dueDate = computeNextOccurrence(input.rrule)
  }

  const stmt = db.prepare(`
    INSERT INTO tasks (title, due_date, rrule, rrule_human, is_recurring, sort_order, todoist_id)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `)
  const result = stmt.run(
    input.title,
    dueDate,
    input.rrule ?? null,
    input.rrule_human ?? null,
    input.is_recurring ? 1 : 0,
    input.sort_order,
    input.todoist_id
  )
  return db.prepare('SELECT * FROM tasks WHERE rowid = ?').get(result.lastInsertRowid) as Task
}

export function getSetting(key: string): string | null {
  const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key) as { value: string } | undefined
  return row?.value ?? null
}

export function setSetting(key: string, value: string): void {
  db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run(key, value)
}

// --- Review feedback ---

function extractMeetingFromContext(task: Task): { meeting_title: string | null; meeting_id: string | null } {
  if (!task.context) return { meeting_title: null, meeting_id: null }
  try {
    const ctx = JSON.parse(task.context)
    return { meeting_title: ctx.meeting_title ?? null, meeting_id: ctx.meeting_id ?? null }
  } catch {
    return { meeting_title: null, meeting_id: null }
  }
}

export function acceptReview(id: string): Task {
  const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(id) as Task | undefined
  if (!task) throw new Error(`Task not found: ${id}`)

  const { meeting_title, meeting_id } = extractMeetingFromContext(task)
  db.prepare(`
    INSERT INTO review_feedback (task_id, action, original_title, final_title, meeting_title, meeting_id)
    VALUES (?, 'accepted', ?, ?, ?, ?)
  `).run(id, task.title, task.title, meeting_title, meeting_id)

  db.prepare("UPDATE tasks SET status = 'active', updated_at = datetime('now') WHERE id = ?").run(id)
  return db.prepare('SELECT * FROM tasks WHERE id = ?').get(id) as Task
}

export function dismissReview(id: string, comment?: string): void {
  const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(id) as Task | undefined
  if (!task) throw new Error(`Task not found: ${id}`)

  const { meeting_title, meeting_id } = extractMeetingFromContext(task)
  db.prepare(`
    INSERT INTO review_feedback (task_id, action, original_title, meeting_title, meeting_id, dismiss_comment)
    VALUES (?, 'dismissed', ?, ?, ?, ?)
  `).run(id, task.title, meeting_title, meeting_id, comment ?? null)

  db.prepare('DELETE FROM tasks WHERE id = ?').run(id)
}

export function logReviewEdit(id: string, originalTitle: string, finalTitle: string, meetingTitle: string | null, meetingId: string | null): void {
  db.prepare(`
    INSERT INTO review_feedback (task_id, action, original_title, final_title, meeting_title, meeting_id)
    VALUES (?, 'edited', ?, ?, ?, ?)
  `).run(id, originalTitle, finalTitle, meetingTitle, meetingId)
}

export function listReviewFeedback(limit = 30): ReviewFeedback[] {
  return db.prepare(
    'SELECT * FROM review_feedback ORDER BY created_at DESC LIMIT ?'
  ).all(limit) as ReviewFeedback[]
}

export function getDb(): Database.Database {
  return db
}
