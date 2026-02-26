import { useState } from 'react'
import type { SyncTask } from '../lib/api'

interface ReviewContext {
  meeting_title?: string
  meeting_date?: string
  meeting_url?: string
  source_text?: string
}

interface ReviewTaskItemProps {
  task: SyncTask
  onAccept: (id: string) => Promise<void>
  onDismiss: (id: string) => Promise<void>
  onEdit: (task: SyncTask) => void
}

function parseContext(task: SyncTask): ReviewContext | null {
  if (!task.context) return null
  try {
    return JSON.parse(task.context) as ReviewContext
  } catch {
    return null
  }
}

export function ReviewTaskItem({ task, onAccept, onDismiss, onEdit }: ReviewTaskItemProps) {
  const [acting, setActing] = useState(false)
  const ctx = parseContext(task)

  const handleAccept = async () => {
    setActing(true)
    try {
      await onAccept(task.id)
    } finally {
      setActing(false)
    }
  }

  const handleDismiss = async () => {
    setActing(true)
    try {
      await onDismiss(task.id)
    } finally {
      setActing(false)
    }
  }

  return (
    <div className={`border-b border-border-subtle ${acting ? 'opacity-50' : ''}`}>
      {/* Content — tap to edit */}
      <div className="px-4 py-2.5 border-l-2 border-review-border" onClick={() => onEdit(task)}>
        <div className="text-sm text-text">{task.title}</div>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-review text-review-text font-medium uppercase tracking-wider">
            Review
          </span>
          {ctx?.meeting_title && (
            <span className="text-[10px] text-text-muted truncate">
              from: {ctx.meeting_title}
            </span>
          )}
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex border-t border-border-subtle">
        <button
          onClick={handleAccept}
          disabled={acting}
          className="flex-1 text-xs font-medium py-2 text-review-accent active:bg-review/60 transition-colors border-r border-border-subtle"
        >
          Accept
        </button>
        <button
          onClick={handleDismiss}
          disabled={acting}
          className="flex-1 text-xs font-medium py-2 text-text-muted active:bg-bg-hover transition-colors"
        >
          Dismiss
        </button>
      </div>
    </div>
  )
}
