export function isOverdue(dateStr: string | null): boolean {
  if (!dateStr) return false
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const date = new Date(dateStr + 'T00:00:00')
  return date < today
}

export function isToday(dateStr: string | null): boolean {
  if (!dateStr) return false
  const today = new Date().toISOString().split('T')[0]
  return dateStr === today
}

export function isTomorrow(dateStr: string | null): boolean {
  if (!dateStr) return false
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  return dateStr === tomorrow.toISOString().split('T')[0]
}

export function formatRelativeDate(dateStr: string | null): string {
  if (!dateStr) return ''

  if (isToday(dateStr)) return 'Today'
  if (isTomorrow(dateStr)) return 'Tomorrow'
  if (isOverdue(dateStr)) {
    const days = daysBetween(dateStr, new Date().toISOString().split('T')[0])
    if (days === 1) return 'Yesterday'
    return `${days}d overdue`
  }

  const date = new Date(dateStr + 'T00:00:00')
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  const diff = Math.ceil((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

  if (diff <= 7) {
    return date.toLocaleDateString('en-US', { weekday: 'long' })
  }

  if (date.getFullYear() === now.getFullYear()) {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function daysBetween(a: string, b: string): number {
  const dateA = new Date(a + 'T00:00:00')
  const dateB = new Date(b + 'T00:00:00')
  return Math.round(Math.abs(dateB.getTime() - dateA.getTime()) / (1000 * 60 * 60 * 24))
}

export function todayISO(): string {
  return new Date().toISOString().split('T')[0]
}
