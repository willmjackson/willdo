import { useState, useEffect, useCallback } from 'react'
import type { Task, CreateTaskInput } from '../../../shared/types'

export function useTasks(view: 'inbox' | 'today') {
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    const result = await window.api.listTasks(view)
    setTasks(result)
    setLoading(false)
    window.api.notifyTrayUpdate()
  }, [view])

  useEffect(() => {
    refresh()
  }, [refresh])

  const addTask = useCallback(async (input: CreateTaskInput) => {
    await window.api.createTask(input)
    await refresh()
  }, [refresh])

  const completeTask = useCallback(async (id: string) => {
    const updated = await window.api.completeTask(id)
    await refresh()
    return updated
  }, [refresh])

  const deleteTask = useCallback(async (id: string) => {
    await window.api.deleteTask(id)
    await refresh()
  }, [refresh])

  const reorderTasks = useCallback(async (id: string, newOrder: number) => {
    await window.api.reorderTask(id, newOrder)
    await refresh()
  }, [refresh])

  return { tasks, loading, refresh, addTask, completeTask, deleteTask, reorderTasks }
}
