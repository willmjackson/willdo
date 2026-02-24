import { useState, useEffect, useCallback } from 'react'
import type { Task, CreateTaskInput, UpdateTaskInput } from '../../../shared/types'

const api = window.api

export function useTasks(view: 'inbox' | 'today') {
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    if (!api) { setLoading(false); return }
    try {
      const result = await api.listTasks(view)
      setTasks(result)
      api.notifyTrayUpdate()
    } catch (e) {
      console.error('Failed to load tasks:', e)
    }
    setLoading(false)
  }, [view])

  useEffect(() => {
    refresh()
    // Poll every 60s as a fallback for external changes
    const interval = setInterval(refresh, 60_000)
    // Listen for immediate notifications from DB file watcher (e.g. /todo skill)
    const unsubscribe = api.onTasksChanged(() => refresh())
    return () => {
      clearInterval(interval)
      unsubscribe()
    }
  }, [refresh])

  const addTask = useCallback(async (input: CreateTaskInput) => {
    await api.createTask(input)
    await refresh()
  }, [refresh])

  const completeTask = useCallback(async (id: string) => {
    const updated = await api.completeTask(id)
    await refresh()
    return updated
  }, [refresh])

  const deleteTask = useCallback(async (id: string) => {
    await api.deleteTask(id)
    await refresh()
  }, [refresh])

  const updateTask = useCallback(async (input: UpdateTaskInput) => {
    await api.updateTask(input)
    await refresh()
  }, [refresh])

  const reorderTasks = useCallback(async (id: string, newOrder: number) => {
    await api.reorderTask(id, newOrder)
    await refresh()
  }, [refresh])

  return { tasks, loading, refresh, addTask, completeTask, deleteTask, updateTask, reorderTasks }
}
