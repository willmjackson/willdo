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
}

export interface CreateTaskInput {
  title: string
  due_date?: string | null
  due_time?: string | null
  rrule?: string | null
  rrule_human?: string | null
  is_recurring?: boolean
}

export interface ParsedTask {
  title: string
  due_date: string | null
  due_time: string | null
  rrule: string | null
  rrule_human: string | null
  is_recurring: boolean
}
