import { formatRelativeDate, isOverdue, isToday } from '@willdo/shared'
import type { SyncTask } from '../lib/api'

interface TaskItemProps {
  task: SyncTask
}

function getRecurrenceFreq(rrule: string): string {
  if (rrule.includes('DAILY')) return 'daily'
  if (rrule.includes('WEEKLY')) return 'weekly'
  if (rrule.includes('MONTHLY')) {
    if (rrule.includes('INTERVAL=3')) return 'quarterly'
    return 'monthly'
  }
  if (rrule.includes('YEARLY')) return 'yearly'
  return 'weekly'
}

export function TaskItem({ task }: TaskItemProps) {
  const overdue = isOverdue(task.due_date)
  const today = isToday(task.due_date)

  const dateBadgeClass = overdue
    ? 'bg-overdue text-overdue-text'
    : today
      ? 'bg-today text-today-text'
      : 'bg-bg-hover text-text-secondary'

  const freq = task.rrule ? getRecurrenceFreq(task.rrule) : null
  const recClass = freq
    ? `bg-rec-${freq} text-rec-${freq}-text`
    : 'bg-recurring text-recurring-text'

  return (
    <div className="flex items-center gap-3 px-4 py-2.5 border-b border-border-subtle">
      {/* Checkbox placeholder (read-only dot) */}
      <div className={`w-4 h-4 rounded-full border-2 shrink-0
        ${task.is_recurring ? 'border-recurring-text' : 'border-border'}`}
      />

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="text-sm text-text truncate">{task.title}</div>

        {/* Badges */}
        {(task.due_date || task.rrule_human) && (
          <div className="flex items-center gap-1.5 mt-0.5">
            {task.due_date && (
              <span className={`text-[11px] px-1.5 py-0.5 rounded-md ${dateBadgeClass}`}>
                {formatRelativeDate(task.due_date)}
              </span>
            )}
            {task.rrule_human && (
              <span className={`text-[11px] px-1.5 py-0.5 rounded-md ${recClass}`}>
                {task.rrule_human}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
