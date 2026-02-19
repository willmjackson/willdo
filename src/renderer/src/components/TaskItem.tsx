import React, { useState } from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { formatRelativeDate, isOverdue, isToday } from '../lib/dates'
import { RecurrenceTag } from './RecurrenceTag'
import type { Task } from '../../../shared/types'

interface TaskItemProps {
  task: Task
  onComplete: (id: string) => Promise<Task>
  onDelete: (id: string) => Promise<void>
  onEdit: (task: Task) => void
  onLaunchClaude: (task: Task) => void
}

export function TaskItem({ task, onComplete, onDelete, onEdit, onLaunchClaude }: TaskItemProps) {
  const [completing, setCompleting] = useState(false)

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  const handleComplete = async () => {
    setCompleting(true)
    try {
      await onComplete(task.id)
    } catch (e) {
      console.error('Failed to complete task:', e)
    } finally {
      setCompleting(false)
    }
  }

  const overdue = isOverdue(task.due_date)
  const today = isToday(task.due_date)

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group flex items-start gap-2 px-4 py-2.5 transition-colors
                   hover:bg-bg-hover rounded-lg mx-1
                   ${isDragging ? 'opacity-50 bg-bg-hover' : ''}
                   ${completing ? 'opacity-60' : ''}`}
    >
      {/* Drag handle */}
      <button
        {...attributes}
        {...listeners}
        className="mt-1 cursor-grab active:cursor-grabbing text-text-muted opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
        tabIndex={-1}
      >
        <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
          <path d="M10 13a1 1 0 1 0 0-2 1 1 0 0 0 0 2zm-4 0a1 1 0 1 0 0-2 1 1 0 0 0 0 2zm1-5a1 1 0 1 1-2 0 1 1 0 0 1 2 0zm3 1a1 1 0 1 0 0-2 1 1 0 0 0 0 2zm1-5a1 1 0 1 1-2 0 1 1 0 0 1 2 0zM7 4a1 1 0 1 1-2 0 1 1 0 0 1 2 0z" />
        </svg>
      </button>

      {/* Checkbox */}
      <button
        onClick={handleComplete}
        className={`mt-0.5 shrink-0 w-[18px] h-[18px] rounded-full border-2 transition-all
                     flex items-center justify-center
                     ${completing ? 'animate-complete' : ''}
                     ${task.is_recurring
                       ? 'border-checkbox-recurring hover:border-checkbox-recurring-hover hover:bg-recurring'
                       : 'border-checkbox hover:border-checkbox-hover hover:bg-accent-subtle'
                     }`}
      >
        {completing && (
          <svg width="10" height="10" viewBox="0 0 16 16" fill="currentColor" className="text-success">
            <path d="M13.78 4.22a.75.75 0 0 1 0 1.06l-7.25 7.25a.75.75 0 0 1-1.06 0L2.22 9.28a.75.75 0 0 1 1.06-1.06L6 10.94l6.72-6.72a.75.75 0 0 1 1.06 0z" />
          </svg>
        )}
      </button>

      {/* Content — click to edit */}
      <div className="flex-1 min-w-0 cursor-pointer" onClick={() => onEdit(task)}>
        <div className="text-sm leading-snug">{task.title}</div>
        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
          {task.due_date && (
            <span className={`text-xs px-1.5 py-0.5 rounded-md ${
              overdue ? 'text-overdue-text bg-overdue font-medium' :
              today ? 'text-today-text bg-today font-medium' :
              'text-text-secondary'
            }`}>
              {formatRelativeDate(task.due_date)}
            </span>
          )}
          {task.is_recurring === 1 && task.rrule_human && (
            <RecurrenceTag rruleHuman={task.rrule_human} />
          )}
        </div>
      </div>

      {/* Launch Claude */}
      <button
        onClick={(e) => { e.stopPropagation(); onLaunchClaude(task) }}
        className="mt-1 text-text-muted opacity-0 group-hover:opacity-100 hover:text-accent transition-all shrink-0"
        tabIndex={-1}
        title="Launch Claude Code"
      >
        <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
          <path d="M0 2.75C0 1.784.784 1 1.75 1h12.5c.966 0 1.75.784 1.75 1.75v10.5A1.75 1.75 0 0 1 14.25 15H1.75A1.75 1.75 0 0 1 0 13.25Zm1.75-.25a.25.25 0 0 0-.25.25v10.5c0 .138.112.25.25.25h12.5a.25.25 0 0 0 .25-.25V2.75a.25.25 0 0 0-.25-.25ZM7.25 12a.75.75 0 0 1 .75-.75h3.25a.75.75 0 0 1 0 1.5H8a.75.75 0 0 1-.75-.75Zm-4.03-5.22a.75.75 0 0 1 1.06 0l2.5 2.5a.75.75 0 0 1 0 1.06l-2.5 2.5a.75.75 0 0 1-1.06-1.06L5.19 9.75 3.22 7.78a.75.75 0 0 1 0-1.06Z" />
        </svg>
      </button>

      {/* Delete */}
      <button
        onClick={() => onDelete(task.id)}
        className="mt-1 text-text-muted opacity-0 group-hover:opacity-100 hover:text-danger transition-all shrink-0"
        tabIndex={-1}
      >
        <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
          <path d="M3.72 3.72a.75.75 0 0 1 1.06 0L8 6.94l3.22-3.22a.75.75 0 1 1 1.06 1.06L9.06 8l3.22 3.22a.75.75 0 1 1-1.06 1.06L8 9.06l-3.22 3.22a.75.75 0 0 1-1.06-1.06L6.94 8 3.72 4.78a.75.75 0 0 1 0-1.06z" />
        </svg>
      </button>
    </div>
  )
}
