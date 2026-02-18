import { ipcMain } from 'electron'
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
import { importFromTodoist } from './todoist-import'
import type { CreateTaskInput, UpdateTaskInput } from '../shared/types'

export function registerIpcHandlers(): void {
  ipcMain.handle('tasks:list', (_event, view: 'inbox' | 'today') => {
    return listTasks(view)
  })

  ipcMain.handle('tasks:create', (_event, input: CreateTaskInput) => {
    return createTask(input)
  })

  ipcMain.handle('tasks:update', (_event, input: UpdateTaskInput) => {
    return updateTask(input)
  })

  ipcMain.handle('tasks:complete', (_event, id: string) => {
    return completeTask(id)
  })

  ipcMain.handle('tasks:delete', (_event, id: string) => {
    return deleteTask(id)
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

  ipcMain.handle('todoist:import', (_event, token: string) => {
    return importFromTodoist(token)
  })
}
