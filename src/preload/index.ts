import { contextBridge, ipcRenderer } from 'electron'
import type { CreateTaskInput, UpdateTaskInput, Task, ImportProgress, CompletedTaskRow, CompletionStats } from '../shared/types'

const api = {
  listTasks: (view: 'inbox' | 'today'): Promise<Task[]> =>
    ipcRenderer.invoke('tasks:list', view),

  createTask: (input: CreateTaskInput): Promise<Task> =>
    ipcRenderer.invoke('tasks:create', input),

  updateTask: (input: UpdateTaskInput): Promise<Task> =>
    ipcRenderer.invoke('tasks:update', input),

  completeTask: (id: string): Promise<Task> =>
    ipcRenderer.invoke('tasks:complete', id),

  deleteTask: (id: string): Promise<void> =>
    ipcRenderer.invoke('tasks:delete', id),

  reorderTask: (id: string, newOrder: number): Promise<void> =>
    ipcRenderer.invoke('tasks:reorder', id, newOrder),

  searchTasks: (query: string): Promise<Task[]> =>
    ipcRenderer.invoke('tasks:search', query),

  getDueTodayCount: (): Promise<number> =>
    ipcRenderer.invoke('tasks:due-today-count'),

  importCSV: (): Promise<ImportProgress> =>
    ipcRenderer.invoke('todoist:import-csv'),

  notifyTrayUpdate: (): void => {
    ipcRenderer.send('tray:update')
  },

  launchClaude: (task: Task): Promise<void> =>
    ipcRenderer.invoke('claude:launch', task),

  getSetting: (key: string): Promise<string | null> =>
    ipcRenderer.invoke('settings:get', key),

  setSetting: (key: string, value: string): Promise<void> =>
    ipcRenderer.invoke('settings:set', key, value),

  listCompletedTasks: (limit?: number): Promise<CompletedTaskRow[]> =>
    ipcRenderer.invoke('history:list', limit),

  getCompletionStats: (): Promise<CompletionStats> =>
    ipcRenderer.invoke('history:stats')
}

contextBridge.exposeInMainWorld('api', api)
