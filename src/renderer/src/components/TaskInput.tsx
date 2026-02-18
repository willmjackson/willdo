import { useRef, useEffect } from 'react'
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
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Add a task... (try &quot;Buy milk tomorrow every week&quot;)"
          className="w-full px-3 py-2.5 bg-bg-input border border-border rounded-lg text-sm
                     placeholder:text-text-muted
                     focus:outline-none focus:border-border-focus focus:ring-1 focus:ring-border-focus
                     transition-colors"
        />
        {hasContent && (
          <button
            onClick={handleSubmit}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-accent hover:text-accent-hover
                       text-sm font-medium px-2 py-1 rounded transition-colors"
          >
            Add
          </button>
        )}
      </div>

      {/* Live parse preview */}
      {hasContent && hasExtras && (
        <div className="mt-1.5 px-1 flex items-center gap-2 text-xs text-text-secondary animate-in">
          {parsed.title && (
            <span className="text-text font-medium truncate">{parsed.title}</span>
          )}
          {parsed.due_date && (
            <span className="shrink-0 bg-bg-hover rounded px-1.5 py-0.5">
              {formatRelativeDate(parsed.due_date)}
            </span>
          )}
          {parsed.rrule_human && (
            <span className="shrink-0 text-blue-600 bg-recurring rounded px-1.5 py-0.5">
              {parsed.rrule_human}
            </span>
          )}
        </div>
      )}
    </div>
  )
}
