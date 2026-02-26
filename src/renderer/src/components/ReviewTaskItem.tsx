import React, { useState } from 'react'
import type { Task, ReviewContext } from '@willdo/shared'

interface ReviewTaskItemProps {
  task: Task
  onAccept: (id: string) => Promise<Task>
  onDismiss: (id: string) => Promise<void>
  onEdit: (task: Task) => void
}

function parseContext(task: Task): ReviewContext | null {
  if (!task.context) return null
  try {
    return JSON.parse(task.context) as ReviewContext
  } catch {
    return null
  }
}

export function ReviewTaskItem({ task, onAccept, onDismiss, onEdit }: ReviewTaskItemProps) {
  const [accepting, setAccepting] = useState(false)
  const ctx = parseContext(task)

  const handleAccept = async (e: React.MouseEvent) => {
    e.stopPropagation()
    setAccepting(true)
    try {
      await onAccept(task.id)
    } catch (err) {
      console.error('Failed to accept review:', err)
    } finally {
      setAccepting(false)
    }
  }

  const handleDismiss = (e: React.MouseEvent) => {
    e.stopPropagation()
    onDismiss(task.id)
  }

  return (
    <div
      className={`group flex items-start gap-2 px-4 py-2.5 transition-colors
                   hover:bg-review/60 rounded-lg mx-1 border-l-2 border-review-border
                   ${accepting ? 'opacity-60' : ''}`}
    >
      {/* Accept button (checkmark) */}
      <button
        onClick={handleAccept}
        className={`mt-0.5 shrink-0 w-[18px] h-[18px] rounded-full border-2 transition-all
                     flex items-center justify-center
                     border-review-accent hover:border-review-accent hover:bg-review
                     ${accepting ? 'animate-complete' : ''}`}
        title="Accept task"
      >
        {accepting && (
          <svg width="10" height="10" viewBox="0 0 16 16" fill="currentColor" className="text-review-accent">
            <path d="M13.78 4.22a.75.75 0 0 1 0 1.06l-7.25 7.25a.75.75 0 0 1-1.06 0L2.22 9.28a.75.75 0 0 1 1.06-1.06L6 10.94l6.72-6.72a.75.75 0 0 1 1.06 0z" />
          </svg>
        )}
      </button>

      {/* Content — click to edit/review */}
      <div className="flex-1 min-w-0 cursor-pointer" onClick={() => onEdit(task)}>
        <div className="text-sm leading-snug">{task.title}</div>
        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
          {/* Review badge */}
          <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-review text-review-text font-medium uppercase tracking-wider">
            Review
          </span>
          {/* Meeting source */}
          {ctx && (
            <span className="text-[10px] text-text-muted truncate max-w-[200px]">
              from: {ctx.meeting_title}
            </span>
          )}
        </div>
      </div>

      {/* Dismiss (X) */}
      <button
        onClick={handleDismiss}
        className="mt-1 text-text-muted opacity-0 group-hover:opacity-100 hover:text-danger transition-all shrink-0"
        tabIndex={-1}
        title="Dismiss"
      >
        <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
          <path d="M3.72 3.72a.75.75 0 0 1 1.06 0L8 6.94l3.22-3.22a.75.75 0 1 1 1.06 1.06L9.06 8l3.22 3.22a.75.75 0 1 1-1.06 1.06L8 9.06l-3.22 3.22a.75.75 0 0 1-1.06-1.06L6.94 8 3.72 4.78a.75.75 0 0 1 0-1.06z" />
        </svg>
      </button>
    </div>
  )
}
