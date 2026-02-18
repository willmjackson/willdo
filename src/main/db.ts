import Database from 'better-sqlite3'
import { app } from 'electron'
import path from 'path'
import type { Task, CreateTaskInput, UpdateTaskInput, Completion } from '../shared/types'

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
}

export function getNextSortOrder(): number {
  const row = db.prepare('SELECT MAX(sort_order) as max_order FROM tasks WHERE is_completed = 0').get() as { max_order: number | null }
  return (row.max_order ?? 0) + 1
}

export function listTasks(view: 'inbox' | 'today'): Task[] {
  if (view === 'today') {
    const today = new Date().toISOString().split('T')[0]
    return db.prepare(
      `SELECT * FROM tasks WHERE is_completed = 0 AND due_date IS NOT NULL AND due_date <= ?
       ORDER BY due_date ASC, sort_order ASC`
    ).all(today) as Task[]
  }
  return db.prepare(
    'SELECT * FROM tasks WHERE is_completed = 0 ORDER BY sort_order ASC'
  ).all() as Task[]
}

export function createTask(input: CreateTaskInput): Task {
  const sortOrder = getNextSortOrder()
  const stmt = db.prepare(`
    INSERT INTO tasks (title, due_date, rrule, rrule_human, is_recurring, sort_order)
    VALUES (?, ?, ?, ?, ?, ?)
  `)
  const result = stmt.run(
    input.title,
    input.due_date ?? null,
    input.rrule ?? null,
    input.rrule_human ?? null,
    input.is_recurring ? 1 : 0,
    sortOrder
  )
  // Get by rowid since we used DEFAULT for id
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
  if (input.is_completed !== undefined) {
    sets.push('is_completed = ?')
    values.push(input.is_completed ? 1 : 0)
  }
  if (input.sort_order !== undefined) {
    sets.push('sort_order = ?')
    values.push(input.sort_order)
  }

  sets.push("updated_at = datetime('now')")
  values.push(input.id)

  db.prepare(`UPDATE tasks SET ${sets.join(', ')} WHERE id = ?`).run(...values)
  return db.prepare('SELECT * FROM tasks WHERE id = ?').get(input.id) as Task
}

export function completeTask(id: string): Task {
  const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(id) as Task | undefined
  if (!task) throw new Error(`Task not found: ${id}`)

  // Log completion
  db.prepare(`
    INSERT INTO completions (task_id, due_date) VALUES (?, ?)
  `).run(id, task.due_date)

  if (task.is_recurring && task.rrule) {
    // Compute next occurrence — done dynamically with rrule.js
    const { RRule } = require('rrule')
    const rule = RRule.fromString(`DTSTART:${(task.due_date || new Date().toISOString().split('T')[0]).replace(/-/g, '')}T000000Z\n${task.rrule}`)
    const now = new Date()
    const next = rule.after(now)

    if (next) {
      const nextDate = next.toISOString().split('T')[0]
      db.prepare("UPDATE tasks SET due_date = ?, updated_at = datetime('now') WHERE id = ?").run(nextDate, id)
    } else {
      db.prepare("UPDATE tasks SET is_completed = 1, updated_at = datetime('now') WHERE id = ?").run(id)
    }
  } else {
    db.prepare("UPDATE tasks SET is_completed = 1, updated_at = datetime('now') WHERE id = ?").run(id)
  }

  return db.prepare('SELECT * FROM tasks WHERE id = ?').get(id) as Task
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

  const stmt = db.prepare(`
    INSERT INTO tasks (title, due_date, rrule, rrule_human, is_recurring, sort_order, todoist_id)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `)
  const result = stmt.run(
    input.title,
    input.due_date ?? null,
    input.rrule ?? null,
    input.rrule_human ?? null,
    input.is_recurring ? 1 : 0,
    input.sort_order,
    input.todoist_id
  )
  return db.prepare('SELECT * FROM tasks WHERE rowid = ?').get(result.lastInsertRowid) as Task
}

export function getDb(): Database.Database {
  return db
}
