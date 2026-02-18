import { app, ipcMain } from 'electron'
import {
  listTasks,
  createTask,
  updateTask,
  completeTask,
  deleteTask,
  reorderTask,
  searchTasks,
  getDueTodayCount
} from './db'
import { pickAndImportCSV } from './todoist-import'
import type { CreateTaskInput, UpdateTaskInput } from '../shared/types'

function updateDockBadge(): void {
  const count = getDueTodayCount()
  app.dock?.setBadge(count > 0 ? String(count) : '')
}

export function registerIpcHandlers(): void {
  ipcMain.handle('tasks:list', (_event, view: 'inbox' | 'today') => {
    return listTasks(view)
  })

  ipcMain.handle('tasks:create', (_event, input: CreateTaskInput) => {
    const task = createTask(input)
    updateDockBadge()
    return task
  })

  ipcMain.handle('tasks:update', (_event, input: UpdateTaskInput) => {
    const task = updateTask(input)
    updateDockBadge()
    return task
  })

  ipcMain.handle('tasks:complete', (_event, id: string) => {
    const task = completeTask(id)
    updateDockBadge()
    return task
  })

  ipcMain.handle('tasks:delete', (_event, id: string) => {
    deleteTask(id)
    updateDockBadge()
  })

  ipcMain.handle('tasks:reorder', (_event, id: string, newOrder: number) => {
    return reorderTask(id, newOrder)
  })

  ipcMain.handle('tasks:search', (_event, query: string) => {
    return searchTasks(query)
  })

  ipcMain.handle('tasks:due-today-count', () => {
    return getDueTodayCount()
  })

  ipcMain.handle('todoist:import-csv', () => {
    const result = pickAndImportCSV()
    updateDockBadge()
    return result
  })

  // Set initial badge on startup
  updateDockBadge()
}
