export interface Task {
  id: string
  title: string
  due_date: string | null
  due_time: string | null
  rrule: string | null
  rrule_human: string | null
  is_recurring: number
  is_completed: number
  sort_order: number
  created_at: string
  updated_at: string
  todoist_id: string | null
  claude_launched_at: string | null
}

export interface CreateTaskInput {
  id?: string
  title: string
  due_date?: string | null
  due_time?: string | null
  rrule?: string | null
  rrule_human?: string | null
  is_recurring?: boolean
}

export interface UpdateTaskInput {
  id: string
  title?: string
  due_date?: string | null
  due_time?: string | null
  rrule?: string | null
  rrule_human?: string | null
  is_recurring?: boolean
  is_completed?: boolean
  sort_order?: number
}

export interface Completion {
  id: string
  task_id: string
  completed_at: string
  due_date: string | null
}

export interface ParsedTask {
  title: string
  due_date: string | null
  rrule: string | null
  rrule_human: string | null
  is_recurring: boolean
}

export interface TodoistTask {
  id: string
  content: string
  due: {
    date: string
    string: string
    is_recurring: boolean
  } | null
  is_completed: boolean
  order: number
}

export interface ImportProgress {
  total: number
  imported: number
  skipped: number
  failed: string[]
}

export interface CompletedTaskRow {
  completion_id: string
  task_id: string
  title: string
  completed_at: string
  due_date: string | null
  due_time: string | null
  launched_with_claude: number
  is_recurring: number
  rrule_human: string | null
}

export interface CompletionStats {
  today: number
  thisWeek: number
  total: number
  claudeAssisted: number
}

// IPC Channel types
export type IpcChannels = {
  'tasks:list': { args: [view: 'inbox' | 'today']; return: Task[] }
  'tasks:create': { args: [input: CreateTaskInput]; return: Task }
  'tasks:update': { args: [input: UpdateTaskInput]; return: Task }
  'tasks:complete': { args: [id: string]; return: Task }
  'tasks:delete': { args: [id: string]; return: void }
  'tasks:reorder': { args: [id: string, newOrder: number]; return: void }
  'tasks:search': { args: [query: string]; return: Task[] }
  'tasks:due-today-count': { args: []; return: number }
  'todoist:import': { args: [token: string]; return: ImportProgress }
  'history:list': { args: [limit?: number]; return: CompletedTaskRow[] }
  'history:stats': { args: []; return: CompletionStats }
}
