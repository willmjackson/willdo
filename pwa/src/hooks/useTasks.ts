import { useState, useEffect, useCallback } from 'react'
import { fetchTasks, createTask as apiCreateTask, type SyncTask } from '../lib/api'

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

  return { tasks, loading, error, refresh, addTask }
}
