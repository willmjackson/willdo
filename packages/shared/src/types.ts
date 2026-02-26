export type TaskStatus = 'active' | 'review'

export interface ReviewContext {
  source: 'granola'
  meeting_id: string
  meeting_title: string
  meeting_date: string
  meeting_url: string
  participants: string[]
  source_text: string
}

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
  status: TaskStatus
  context: string | null
}

export interface CreateTaskInput {
  title: string
  due_date?: string | null
  due_time?: string | null
  rrule?: string | null
  rrule_human?: string | null
  is_recurring?: boolean
  status?: TaskStatus
  context?: string | null
}

export interface ParsedTask {
  title: string
  due_date: string | null
  due_time: string | null
  rrule: string | null
  rrule_human: string | null
  is_recurring: boolean
}
