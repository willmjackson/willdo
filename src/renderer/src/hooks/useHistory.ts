import { useState, useCallback } from 'react'
import type { CompletedTaskRow, CompletionStats } from '../../../shared/types'

const api = window.api

export function useHistory() {
  const [completions, setCompletions] = useState<CompletedTaskRow[]>([])
  const [stats, setStats] = useState<CompletionStats>({ today: 0, thisWeek: 0, total: 0, claudeAssisted: 0 })
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    if (!api) { setLoading(false); return }
    try {
      const [rows, s] = await Promise.all([
        api.listCompletedTasks(),
        api.getCompletionStats()
      ])
      setCompletions(rows)
      setStats(s)
    } catch (e) {
      console.error('Failed to load history:', e)
    }
    setLoading(false)
  }, [])

  return { completions, stats, loading, refresh }
}
