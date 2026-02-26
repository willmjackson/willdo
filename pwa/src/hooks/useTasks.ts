import { useState, useEffect, useCallback } from 'react'
import { fetchTasks, createTask as apiCreateTask, completeTask as apiCompleteTask, deleteTask as apiDeleteTask, updateTask as apiUpdateTask, type SyncTask } from '../lib/api'

export function useTasks() {
  const [tasks, setTasks] = useState<SyncTask[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    try {
      setError(null)
      const data = await fetchTasks()
      setTasks(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load tasks')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    refresh()
    // Auto-refresh when the app returns to foreground (e.g. switching back to PWA)
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') refresh()
    }
    document.addEventListener('visibilitychange', handleVisibility)
    return () => document.removeEventListener('visibilitychange', handleVisibility)
  }, [refresh])

  const addTask = useCallback(async (input: {
    title: string
    due_date: string | null
    due_time: string | null
    rrule: string | null
    rrule_human: string | null
    is_recurring: boolean
  }) => {
    // Generate a random ID for the mobile task
    const id = 'm_' + crypto.randomUUID().slice(0, 16)
    // Sort order: put at end
    const maxOrder = tasks.length > 0 ? Math.max(...tasks.map(t => t.sort_order)) : 0
    const sortOrder = maxOrder + 1

    const allTasks = await apiCreateTask({
      id,
      title: input.title,
      due_date: input.due_date,
      due_time: input.due_time,
      rrule: input.rrule,
      rrule_human: input.rrule_human,
      is_recurring: input.is_recurring,
      sort_order: sortOrder,
    })
    setTasks(allTasks)
  }, [tasks])

  const completeTask = useCallback(async (id: string) => {
    const allTasks = await apiCompleteTask(id)
    setTasks(allTasks)
  }, [])

  const deleteTask = useCallback(async (id: string) => {
    const allTasks = await apiDeleteTask(id)
    setTasks(allTasks)
  }, [])

  const updateTask = useCallback(async (id: string, fields: {
    title?: string
    due_date?: string | null
    due_time?: string | null
    rrule?: string | null
    rrule_human?: string | null
    is_recurring?: number
  }) => {
    const allTasks = await apiUpdateTask(id, fields)
    setTasks(allTasks)
  }, [])

  const acceptReview = useCallback(async (id: string) => {
    const allTasks = await apiUpdateTask(id, { status: 'active' })
    setTasks(allTasks)
  }, [])

  const dismissReview = useCallback(async (id: string) => {
    const allTasks = await apiDeleteTask(id)
    setTasks(allTasks)
  }, [])

  return { tasks, loading, error, refresh, addTask, completeTask, deleteTask, updateTask, acceptReview, dismissReview }
}
