import { useState, useRef } from 'react'
import { useSwipeable } from 'react-swipeable'
import { formatRelativeDate, formatTime, isOverdue, isToday } from '@willdo/shared'
import type { SyncTask } from '../lib/api'

interface TaskItemProps {
  task: SyncTask
  onComplete: (id: string) => void
  onDelete: (id: string) => void
}

const COMPLETE_THRESHOLD = 0.3 // 30% of width
const DELETE_THRESHOLD = 0.35  // 35% of width

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

export function TaskItem({ task, onComplete, onDelete }: TaskItemProps) {
  const [offset, setOffset] = useState(0)
  const [dismissed, setDismissed] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const isSwiping = useRef(false)

  const width = containerRef.current?.offsetWidth ?? 320

  const handlers = useSwipeable({
    onSwiping: ({ deltaX }) => {
      isSwiping.current = true
      setOffset(deltaX)
    },
    onSwipedRight: ({ velocity }) => {
      if (offset > width * COMPLETE_THRESHOLD || velocity > 0.5) {
        setDismissed(true)
        setOffset(width)
        setTimeout(() => onComplete(task.id), 300)
      } else {
        setOffset(0)
      }
      isSwiping.current = false
    },
    onSwipedLeft: ({ velocity }) => {
      if (Math.abs(offset) > width * DELETE_THRESHOLD || velocity > 0.5) {
        setDismissed(true)
        setOffset(-width)
        setTimeout(() => onDelete(task.id), 300)
      } else {
        setOffset(0)
      }
      isSwiping.current = false
    },
    onTouchEndOrOnMouseUp: () => {
      if (isSwiping.current) {
        isSwiping.current = false
      }
    },
    trackMouse: false,
    delta: 10,
    preventScrollOnSwipe: true,
  })

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

  const pastComplete = offset > width * COMPLETE_THRESHOLD
  const pastDelete = offset < -(width * DELETE_THRESHOLD)

  return (
    <div
      ref={containerRef}
      className="relative overflow-hidden"
      style={{
        maxHeight: dismissed ? 0 : 200,
        opacity: dismissed ? 0 : 1,
        transition: dismissed ? 'max-height 0.3s ease, opacity 0.2s ease' : undefined,
      }}
    >
      {/* Background reveal */}
      <div className="absolute inset-0 flex items-center">
        {/* Complete (green) — left side */}
        <div
          className="flex items-center justify-start pl-4 h-full w-1/2 transition-colors"
          style={{ backgroundColor: offset > 0 ? (pastComplete ? '#16a34a' : '#86efac') : 'transparent' }}
        >
          {offset > 20 && (
            <svg width="20" height="20" viewBox="0 0 20 20" fill="white" style={{ opacity: pastComplete ? 1 : 0.6 }}>
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
          )}
        </div>
        {/* Delete (red) — right side */}
        <div
          className="flex items-center justify-end pr-4 h-full w-1/2 transition-colors"
          style={{ backgroundColor: offset < 0 ? (pastDelete ? '#dc2626' : '#fca5a5') : 'transparent' }}
        >
          {offset < -20 && (
            <svg width="20" height="20" viewBox="0 0 20 20" fill="white" style={{ opacity: pastDelete ? 1 : 0.6 }}>
              <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          )}
        </div>
      </div>

      {/* Foreground content */}
      <div
        {...handlers}
        className="relative bg-bg border-b border-border-subtle"
        style={{
          transform: `translateX(${offset}px)`,
          transition: isSwiping.current ? 'none' : 'transform 0.3s ease',
        }}
      >
        <div className="flex items-center gap-3 px-4 py-2.5">
          <div className={`w-4 h-4 rounded-full border-2 shrink-0
            ${task.is_recurring ? 'border-recurring-text' : 'border-border'}`}
          />
          <div className="flex-1 min-w-0">
            <div className="text-sm text-text truncate">{task.title}</div>
            {(task.due_date || task.rrule_human) && (
              <div className="flex items-center gap-1.5 mt-0.5">
                {task.due_date && (
                  <span className={`text-[11px] px-1.5 py-0.5 rounded-md ${dateBadgeClass}`}>
                    {formatRelativeDate(task.due_date)}{task.due_time ? ` ${formatTime(task.due_time)}` : ''}
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
      </div>
    </div>
  )
}
