import React, { useRef, useEffect } from 'react'
import { useQuickAdd } from '../hooks/useQuickAdd'
import { formatRelativeDate } from '../lib/dates'
import type { CreateTaskInput } from '../../../shared/types'

interface TaskInputProps {
  onAdd: (input: CreateTaskInput) => Promise<void>
}

export function TaskInput({ onAdd }: TaskInputProps) {
  const { input, setInput, parsed, hasContent, hasExtras, reset } = useQuickAdd()
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const handleKeydown = (e: KeyboardEvent) => {
      if (e.metaKey && e.key === 'n') {
        e.preventDefault()
        inputRef.current?.focus()
      }
    }
    window.addEventListener('keydown', handleKeydown)
    return () => window.removeEventListener('keydown', handleKeydown)
  }, [])

  const handleSubmit = async () => {
    if (!parsed.title.trim()) return
    await onAdd({
      title: parsed.title,
      due_date: parsed.due_date,
      rrule: parsed.rrule,
      rrule_human: parsed.rrule_human,
      is_recurring: parsed.is_recurring
    })
    reset()
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
    if (e.key === 'Escape') {
      reset()
      inputRef.current?.blur()
    }
  }

  return (
    <div className="px-4 pb-3">
      <input
        ref={inputRef}
        type="text"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder='Add a task... (try "Buy milk tomorrow every week")'
        className="w-full px-3 py-2.5 bg-bg-input border border-border rounded-lg text-sm
                   placeholder:text-text-muted
                   focus:outline-none focus:border-border-focus focus:ring-1 focus:ring-border-focus
                   transition-colors"
      />

      {/* Live parse preview + Add button row */}
      {hasContent && (
        <div className="mt-2 flex items-center justify-between gap-2 animate-in">
          <div className="flex items-center gap-2 text-xs min-w-0">
            {hasExtras && (
              <>
                {parsed.title && (
                  <span className="text-text font-medium truncate">{parsed.title}</span>
                )}
                {parsed.due_date && (
                  <span className="shrink-0 bg-bg-hover rounded-md px-1.5 py-0.5 text-text-secondary">
                    {formatRelativeDate(parsed.due_date)}
                  </span>
                )}
                {parsed.rrule_human && (
                  <span className="shrink-0 text-recurring-text bg-recurring rounded-md px-1.5 py-0.5">
                    {parsed.rrule_human}
                  </span>
                )}
              </>
            )}
          </div>
          <button
            onClick={handleSubmit}
            className="shrink-0 text-xs font-semibold px-3 py-1 rounded-md
                       bg-accent text-text-inverse hover:bg-accent-hover
                       transition-colors"
          >
            Add
          </button>
        </div>
      )}
    </div>
  )
}
