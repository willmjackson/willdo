import { useRef, useEffect } from 'react'
import { useQuickAdd } from '../hooks/useQuickAdd'
import { formatRelativeDate, formatTime } from '@willdo/shared'
import type { CreateTaskInput } from '@willdo/shared'

interface TaskInputProps {
  onAdd: (input: CreateTaskInput & { is_recurring: boolean }) => Promise<void>
}

export function TaskInput({ onAdd }: TaskInputProps) {
  const { input, setInput, parsed, hasContent, hasExtras, reset } = useQuickAdd()
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const handleSubmit = async () => {
    if (!parsed.title.trim()) return
    await onAdd({
      title: parsed.title,
      due_date: parsed.due_date,
      due_time: parsed.due_time,
      rrule: parsed.rrule,
      rrule_human: parsed.rrule_human,
      is_recurring: parsed.is_recurring,
    })
    reset()
    inputRef.current?.focus()
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
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
        placeholder='Add a task... (try "Buy milk tomorrow")'
        enterKeyHint="done"
        autoCapitalize="sentences"
        className="w-full px-3 py-2.5 bg-bg-input border border-border rounded-lg text-base
                   placeholder:text-text-muted
                   focus:outline-none focus:border-border-focus focus:ring-1 focus:ring-border-focus
                   transition-colors"
      />

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
                    {formatRelativeDate(parsed.due_date)}{parsed.due_time ? ` ${formatTime(parsed.due_time)}` : ''}
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
            className="shrink-0 text-sm font-semibold px-4 py-1.5 rounded-lg
                       bg-accent text-text-inverse active:bg-accent-hover
                       transition-colors"
          >
            Add
          </button>
        </div>
      )}
    </div>
  )
}
