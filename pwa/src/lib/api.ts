export interface SyncTask {
  id: string
  title: string
  due_date: string | null
  due_time: string | null
  rrule: string | null
  rrule_human: string | null
  is_recurring: number
  is_completed: number
  sort_order: number
  created_at: string
  updated_at: string
  source: string
}

function getConfig(): { url: string; key: string } | null {
  const url = localStorage.getItem('willdo_sync_url')
  const key = localStorage.getItem('willdo_sync_key')
  if (!url || !key) return null
  return { url: url.replace(/\/$/, ''), key }
}

export function isConfigured(): boolean {
  return getConfig() !== null
}

export function saveConfig(url: string, key: string): void {
  localStorage.setItem('willdo_sync_url', url.replace(/\/$/, ''))
  localStorage.setItem('willdo_sync_key', key)
}

export function clearConfig(): void {
  localStorage.removeItem('willdo_sync_url')
  localStorage.removeItem('willdo_sync_key')
}

async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const config = getConfig()
  if (!config) throw new Error('Not configured')

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
    throw new Error(`API error ${res.status}: ${text}`)
  }

  return res.json()
}

export async function fetchTasks(): Promise<SyncTask[]> {
  return apiFetch<SyncTask[]>('/tasks')
}

export async function createTask(task: {
  id: string
  title: string
  due_date: string | null
  due_time: string | null
  rrule: string | null
  rrule_human: string | null
  is_recurring: boolean
  sort_order: number
}): Promise<SyncTask[]> {
  return apiFetch<SyncTask[]>('/tasks', {
    method: 'POST',
    body: JSON.stringify(task),
  })
}
