import { contextBridge, ipcRenderer } from 'electron'
import type { CreateTaskInput, UpdateTaskInput, Task, ImportProgress } from '../shared/types'

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
  }
}

contextBridge.exposeInMainWorld('api', api)
