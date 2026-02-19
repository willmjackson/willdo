import type { CreateTaskInput, UpdateTaskInput, Task, ImportProgress, CompletedTaskRow, CompletionStats } from '../shared/types'

declare global {
  interface Window {
    api: {
      listTasks: (view: 'inbox' | 'today') => Promise<Task[]>
      createTask: (input: CreateTaskInput) => Promise<Task>
      updateTask: (input: UpdateTaskInput) => Promise<Task>
      completeTask: (id: string) => Promise<Task>
      deleteTask: (id: string) => Promise<void>
      reorderTask: (id: string, newOrder: number) => Promise<void>
      searchTasks: (query: string) => Promise<Task[]>
      getDueTodayCount: () => Promise<number>
      importCSV: () => Promise<ImportProgress>
      notifyTrayUpdate: () => void
      launchClaude: (task: Task) => Promise<void>
      getSetting: (key: string) => Promise<string | null>
      setSetting: (key: string, value: string) => Promise<void>
      listCompletedTasks: (limit?: number) => Promise<CompletedTaskRow[]>
      getCompletionStats: () => Promise<CompletionStats>
    }
  }
}
