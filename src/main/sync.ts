import { getSetting, listTasks, createTask, completeTask, deleteTask, updateTask } from './db'
import type { Task } from '../shared/types'

let syncInterval: ReturnType<typeof setInterval> | null = null

function getConfig(): { url: string; key: string } | null {
  const url = getSetting('sync_api_url')
  const key = getSetting('sync_api_key')
  if (!url || !key) return null
  return { url: url.replace(/\/$/, ''), key }
}

async function apiFetch(path: string, options: RequestInit = {}): Promise<Response> {
  const config = getConfig()
  if (!config) throw new Error('Sync not configured')

  const res = await fetch(`${config.url}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': config.key,
      ...(options.headers || {}),
    },
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Sync API error ${res.status}: ${text}`)
  }
  return res
}

/**
 * Push all active tasks to the cloud. Called after every local mutation.
 */
export async function pushTasks(): Promise<void> {
  const config = getConfig()
  if (!config) return

  const tasks = listTasks('inbox') as Task[]
  await apiFetch('/sync/push', {
    method: 'POST',
    body: JSON.stringify({ tasks }),
  })
}

/**
 * Pull unsynced mobile tasks from the cloud, create them locally,
 * then acknowledge and push the updated state.
 */
export async function pullMobileTasks(): Promise<number> {
  const config = getConfig()
  if (!config) return 0

  const res = await apiFetch('/sync/pending')
  const pending = (await res.json()) as Array<{
    id: string
    title: string
    due_date: string | null
    due_time: string | null
    rrule: string | null
    rrule_human: string | null
    is_recurring: number
    is_completed: number
    sort_order: number
    status: string
    context: string | null
  }>

  if (pending.length === 0) return 0

  // Build a set of local task IDs for detecting edits vs new tasks
  const localTasks = listTasks('inbox') as Task[]
  const localIds = new Set(localTasks.map(t => t.id))

  // Process each pending mobile action
  const ackIds: string[] = []
  for (const task of pending) {
    try {
      if (task.is_completed === 2) {
        // Deletion from mobile — delete the local task
        deleteTask(task.id)
      } else if (task.is_completed === 1) {
        // Completion from mobile — complete the local task
        completeTask(task.id)
      } else if (localIds.has(task.id)) {
        // Edit from mobile — update the existing local task
        updateTask({
          id: task.id,
          title: task.title,
          due_date: task.due_date,
          due_time: task.due_time,
          rrule: task.rrule,
          rrule_human: task.rrule_human,
          is_recurring: !!task.is_recurring,
          status: task.status as 'active' | 'review' | undefined,
          context: task.context,
        })
      } else {
        // New task from mobile — create locally with same ID
        createTask({
          id: task.id,
          title: task.title,
          due_date: task.due_date,
          due_time: task.due_time,
          rrule: task.rrule,
          rrule_human: task.rrule_human,
          is_recurring: !!task.is_recurring,
          status: task.status as 'active' | 'review' | undefined,
          context: task.context,
        })
      }
      ackIds.push(task.id)
    } catch (err) {
      console.error(`Failed to process mobile task "${task.title}":`, err)
    }
  }

  // Acknowledge imported tasks
  if (ackIds.length > 0) {
    await apiFetch('/sync/ack', {
      method: 'POST',
      body: JSON.stringify({ ids: ackIds }),
    })
  }

  // Push updated state so cloud has the desktop IDs
  await pushTasks()

  return ackIds.length
}

/**
 * Start periodic sync polling (every 60 seconds).
 */
export function startSync(): void {
  if (syncInterval) return

  // Initial pull on startup (delayed to let the app settle)
  setTimeout(() => {
    pullMobileTasks().catch((err) => console.error('Sync pull failed:', err))
  }, 3000)

  syncInterval = setInterval(() => {
    pullMobileTasks().catch((err) => console.error('Sync pull failed:', err))
  }, 60_000)

  console.log('Sync started (60s poll interval)')
}

/**
 * Stop periodic sync polling.
 */
export function stopSync(): void {
  if (syncInterval) {
    clearInterval(syncInterval)
    syncInterval = null
    console.log('Sync stopped')
  }
}
