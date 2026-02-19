CREATE TABLE tasks (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  due_date TEXT,
  rrule TEXT,
  rrule_human TEXT,
  is_recurring INTEGER DEFAULT 0,
  is_completed INTEGER DEFAULT 0,
  sort_order REAL NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  source TEXT DEFAULT 'desktop',
  synced INTEGER DEFAULT 1
);
