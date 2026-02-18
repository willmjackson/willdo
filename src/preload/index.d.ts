import type { CreateTaskInput, UpdateTaskInput, Task, ImportProgress } from '../shared/types'

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
      importFromTodoist: (token: string) => Promise<ImportProgress>
      notifyTrayUpdate: () => void
    }
  }
}
