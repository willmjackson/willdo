import { useState, useEffect, useRef } from 'react'
import { extractRecurrence, formatRelativeDate, formatTime } from '@willdo/shared'
import type { SyncTask } from '../lib/api'

interface ReviewContext {
  meeting_title?: string
  meeting_date?: string
  meeting_url?: string
  participants?: string[]
  source_text?: string
}

interface TaskEditModalProps {
  task: SyncTask
  onSave: (id: string, fields: {
    title?: string
    due_date?: string | null
    due_time?: string | null
    rrule?: string | null
    rrule_human?: string | null
    is_recurring?: number
  }) => Promise<void>
  onDelete: (id: string) => void
  onClose: () => void
  onAcceptReview?: (id: string) => Promise<void>
  onDismissReview?: (id: string) => Promise<void>
}

function buildCalendarDays(year: number, month: number): (number | null)[] {
  const firstDay = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const cells: (number | null)[] = []
  for (let i = 0; i < firstDay; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)
  return cells
}

function toISO(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

function getOrdinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd']
  const v = n % 100
  return n + (s[(v - 20) % 10] || s[v] || s[0])
}

function buildRecurrencePresets(dueDate: string): { label: string; detail: string; value: string }[] {
  const ref = dueDate ? new Date(dueDate + 'T00:00:00') : new Date()
  const dayName = ref.toLocaleDateString('en-US', { weekday: 'long' })
  const monthName = ref.toLocaleDateString('en-US', { month: 'long' })
  const dayOfMonth = ref.getDate()

  return [
    { label: 'Every day', detail: '', value: 'every day' },
    { label: 'Every week', detail: `on ${dayName}`, value: `every ${dayName.toLowerCase()}` },
    { label: 'Every weekday', detail: '(Mon\u2013Fri)', value: 'every weekday' },
    { label: 'Every month', detail: `on the ${getOrdinal(dayOfMonth)}`, value: `on the ${getOrdinal(dayOfMonth)} of every month` },
    { label: 'Every year', detail: `on ${monthName} ${getOrdinal(dayOfMonth)}`, value: `every ${monthName.toLowerCase()} ${dayOfMonth}` },
  ]
}

function parseContext(task: SyncTask): ReviewContext | null {
  if (!task.context) return null
  try {
    return JSON.parse(task.context) as ReviewContext
  } catch {
    return null
  }
}

export function TaskEditModal({ task, onSave, onDelete, onClose, onAcceptReview, onDismissReview }: TaskEditModalProps) {
  const [title, setTitle] = useState(task.title)
  const [dueDate, setDueDate] = useState(task.due_date || '')
  const [dueTime, setDueTime] = useState(task.due_time || '')
  const [recurrenceText, setRecurrenceText] = useState(task.rrule_human || '')
  const [showRecurrencePicker, setShowRecurrencePicker] = useState(false)
  const [customRecurrence, setCustomRecurrence] = useState(false)
  const [saving, setSaving] = useState(false)
  const titleRef = useRef<HTMLTextAreaElement>(null)

  const isReview = task.status === 'review'
  const ctx = isReview ? parseContext(task) : null

  // Calendar state
  const initialDate = dueDate ? new Date(dueDate + 'T00:00:00') : new Date()
  const [calYear, setCalYear] = useState(initialDate.getFullYear())
  const [calMonth, setCalMonth] = useState(initialDate.getMonth())

  const resizeTitle = () => {
    const el = titleRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = el.scrollHeight + 'px'
  }

  useEffect(() => {
    resizeTitle()
  }, [])

  // Prevent body scroll when modal is open
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  const todayISO = new Date().toISOString().split('T')[0]
  const calDays = buildCalendarDays(calYear, calMonth)
  const monthLabel = new Date(calYear, calMonth).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })

  const handleCalPrev = () => {
    if (calMonth === 0) { setCalYear(y => y - 1); setCalMonth(11) }
    else setCalMonth(m => m - 1)
  }
  const handleCalNext = () => {
    if (calMonth === 11) { setCalYear(y => y + 1); setCalMonth(0) }
    else setCalMonth(m => m + 1)
  }

  const selectDate = (day: number) => {
    setDueDate(toISO(calYear, calMonth, day))
  }

  const handleQuickDate = (offset: 'today' | 'tomorrow' | 'next-week' | 'none') => {
    if (offset === 'none') {
      setDueDate('')
      return
    }
    const d = new Date()
    if (offset === 'tomorrow') d.setDate(d.getDate() + 1)
    if (offset === 'next-week') {
      const day = d.getDay()
      d.setDate(d.getDate() + (day === 0 ? 1 : 8 - day))
    }
    const iso = d.toISOString().split('T')[0]
    setDueDate(iso)
    setCalYear(d.getFullYear())
    setCalMonth(d.getMonth())
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const rec = recurrenceText.trim() ? extractRecurrence(recurrenceText.trim()) : { result: null, remainder: recurrenceText }

      await onSave(task.id, {
        title: title.trim() || task.title,
        due_date: dueDate || null,
        due_time: dueTime || null,
        rrule: rec.result?.rrule ?? null,
        rrule_human: rec.result?.rrule_human ?? null,
        is_recurring: rec.result ? 1 : 0,
      })
      onClose()
    } catch (e) {
      console.error('Save failed:', e)
    } finally {
      setSaving(false)
    }
  }

  const handleAcceptReview = async () => {
    if (!onAcceptReview) return
    setSaving(true)
    try {
      // Save any edits first
      const titleChanged = title.trim() !== task.title
      const dateChanged = (dueDate || null) !== task.due_date
      if (titleChanged || dateChanged) {
        const rec = recurrenceText.trim() ? extractRecurrence(recurrenceText.trim()) : { result: null, remainder: recurrenceText }
        await onSave(task.id, {
          title: title.trim() || task.title,
          due_date: dueDate || null,
          due_time: dueTime || null,
          rrule: rec.result?.rrule ?? null,
          rrule_human: rec.result?.rrule_human ?? null,
          is_recurring: rec.result ? 1 : 0,
        })
      }
      await onAcceptReview(task.id)
      onClose()
    } catch (e) {
      console.error('Accept failed:', e)
    } finally {
      setSaving(false)
    }
  }

  const handleDismissReview = async () => {
    if (!onDismissReview) return
    await onDismissReview(task.id)
    onClose()
  }

  const handleDelete = () => {
    onDelete(task.id)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 bg-overlay animate-fade-in" onClick={onClose}>
      {/* Full-screen slide-up panel */}
      <div
        className="absolute inset-x-0 bottom-0 bg-bg rounded-t-2xl shadow-lg overflow-y-auto animate-slide-up"
        style={{ maxHeight: '92dvh' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-2 pb-1">
          <div className="w-10 h-1 rounded-full bg-border" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-4 pt-1 pb-2">
          <button onClick={onClose} className="text-sm text-text-muted active:text-text">
            Cancel
          </button>
          <span className={`text-sm font-semibold ${isReview ? 'text-review-text' : 'text-text'}`}>
            {isReview ? 'Review Task' : 'Edit Task'}
          </span>
          {isReview ? (
            <button
              onClick={handleAcceptReview}
              disabled={saving}
              className="text-sm font-semibold text-review-accent active:opacity-70 disabled:opacity-50"
            >
              {saving ? 'Accepting...' : 'Accept'}
            </button>
          ) : (
            <button
              onClick={handleSave}
              disabled={saving}
              className="text-sm font-semibold text-accent active:text-accent-hover disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save'}
            </button>
          )}
        </div>

        <div className="border-t border-border-subtle" />

        {/* Meeting context (review tasks only) */}
        {isReview && ctx && (
          <div className="mx-4 mt-3 mb-1 rounded-xl bg-review/60 border border-review-border/40 px-3 py-2.5">
            <div className="flex items-center gap-1.5 mb-1.5">
              <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor" className="text-review-accent shrink-0">
                <path d="M1.5 14.25c0 .138.112.25.25.25h12.5a.25.25 0 0 0 .25-.25V4.75a.25.25 0 0 0-.25-.25h-2.5a.75.75 0 0 1 0-1.5h2.5c.966 0 1.75.784 1.75 1.75v9.5A1.75 1.75 0 0 1 14.25 16H1.75A1.75 1.75 0 0 1 0 14.25v-9.5C0 3.784.784 3 1.75 3h2.5a.75.75 0 0 1 0 1.5h-2.5a.25.25 0 0 0-.25.25zM8 1a.75.75 0 0 1 .75.75v6.44l1.22-1.22a.75.75 0 1 1 1.06 1.06l-2.5 2.5a.75.75 0 0 1-1.06 0l-2.5-2.5a.75.75 0 0 1 1.06-1.06l1.22 1.22V1.75A.75.75 0 0 1 8 1z" />
              </svg>
              {ctx.meeting_url ? (
                <a
                  href={ctx.meeting_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs font-medium text-review-text active:underline truncate"
                >
                  {ctx.meeting_title}
                </a>
              ) : (
                <span className="text-xs font-medium text-review-text truncate">{ctx.meeting_title}</span>
              )}
              {ctx.meeting_date && (
                <span className="text-[10px] text-text-muted shrink-0">{ctx.meeting_date}</span>
              )}
            </div>
            {ctx.participants && ctx.participants.length > 0 && (
              <div className="text-[10px] text-text-muted mb-1.5">
                With: {ctx.participants.join(', ')}
              </div>
            )}
            {ctx.source_text && (
              <div className="text-xs text-text-secondary italic leading-relaxed">
                &ldquo;{ctx.source_text}&rdquo;
              </div>
            )}
          </div>
        )}

        {/* Title */}
        <div className="px-4 py-3">
          <textarea
            ref={titleRef}
            value={title}
            onChange={e => { setTitle(e.target.value); resizeTitle() }}
            rows={1}
            className="w-full text-base font-medium bg-transparent border-none outline-none resize-none
                       text-text placeholder:text-text-muted overflow-y-auto"
            style={{ maxHeight: 'calc(1.375em * 4 + 2px)' }}
            placeholder="Task title"
          />
        </div>

        <div className="border-t border-border-subtle" />

        {/* Date section */}
        <div className="px-4 py-3">
          <div className="text-xs text-text-muted font-medium uppercase tracking-wide mb-2">Date</div>

          {/* Current date display */}
          {dueDate && (
            <div className="flex items-center gap-2 mb-3 text-sm">
              <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" className="text-accent shrink-0">
                <path d="M4.5 1a.5.5 0 0 1 .5.5V2h6v-.5a.5.5 0 0 1 1 0V2h1.5A1.5 1.5 0 0 1 15 3.5v10a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 1 13.5v-10A1.5 1.5 0 0 1 2.5 2H4v-.5a.5.5 0 0 1 .5-.5zM14 5.5H2v8a.5.5 0 0 0 .5.5h11a.5.5 0 0 0 .5-.5v-8z" />
              </svg>
              <span className="text-text font-medium">{formatRelativeDate(dueDate)}{dueTime ? ` ${formatTime(dueTime)}` : ''}</span>
              <span className="text-text-muted text-xs">({dueDate})</span>
            </div>
          )}

          {/* Quick date buttons */}
          <div className="flex gap-1.5 mb-3 flex-wrap">
            {([
              { label: 'Today', key: 'today' as const },
              { label: 'Tomorrow', key: 'tomorrow' as const },
              { label: 'Next week', key: 'next-week' as const },
              { label: 'No date', key: 'none' as const },
            ]).map(({ label, key }) => (
              <button
                key={key}
                onClick={() => handleQuickDate(key)}
                className="text-xs px-2.5 py-1.5 rounded-lg border border-border
                           active:bg-bg-hover active:border-border-focus transition-colors text-text-secondary"
              >
                {label}
              </button>
            ))}
          </div>

          {/* Calendar */}
          <div className="border border-border rounded-xl p-3">
            {/* Month nav */}
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-text">{monthLabel}</span>
              <div className="flex gap-2">
                <button onClick={handleCalPrev} className="text-text-muted active:text-text p-1">
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M10.354 3.354a.5.5 0 0 0-.708-.708l-5 5a.5.5 0 0 0 0 .708l5 5a.5.5 0 0 0 .708-.708L5.707 8l4.647-4.646z"/></svg>
                </button>
                <button onClick={handleCalNext} className="text-text-muted active:text-text p-1">
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M5.646 3.354a.5.5 0 0 1 .708-.708l5 5a.5.5 0 0 1 0 .708l-5 5a.5.5 0 0 1-.708-.708L10.293 8 5.646 3.354z"/></svg>
                </button>
              </div>
            </div>

            {/* Day headers */}
            <div className="grid grid-cols-7 text-center mb-1">
              {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
                <div key={i} className="text-[10px] text-text-muted font-medium py-0.5">{d}</div>
              ))}
            </div>

            {/* Day grid */}
            <div className="grid grid-cols-7 text-center">
              {calDays.map((day, i) => {
                if (day === null) return <div key={i} />
                const iso = toISO(calYear, calMonth, day)
                const isSelected = iso === dueDate
                const isTodayDate = iso === todayISO
                return (
                  <button
                    key={i}
                    onClick={() => selectDate(day)}
                    className={`text-sm py-1.5 rounded-lg transition-colors
                      ${isSelected
                        ? 'bg-accent text-text-inverse font-semibold'
                        : isTodayDate
                          ? 'text-accent font-semibold active:bg-bg-hover'
                          : 'text-text-secondary active:bg-bg-hover'
                      }`}
                  >
                    {day}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Time */}
          <div className="flex items-center gap-2 mt-3">
            <input
              type="time"
              value={dueTime}
              onChange={e => setDueTime(e.target.value)}
              className="text-sm px-3 py-1.5 rounded-lg border border-border bg-bg-input
                         outline-none focus:border-border-focus text-text"
            />
            {dueTime && (
              <button
                onClick={() => setDueTime('')}
                className="text-xs text-text-muted active:text-danger transition-colors"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        <div className="border-t border-border-subtle" />

        {/* Recurrence */}
        <div className="px-4 py-3">
          <div className="text-xs text-text-muted font-medium uppercase tracking-wide mb-2">Recurrence</div>

          {/* Current recurrence / trigger */}
          <button
            onClick={() => { setShowRecurrencePicker(p => !p); setCustomRecurrence(false) }}
            className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-left transition-colors
              ${recurrenceText
                ? 'bg-recurring text-recurring-text'
                : 'border border-border text-text-muted active:border-border-focus'
              }`}
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" className="shrink-0">
              <path d="M11.534 7h3.932a.25.25 0 0 1 .192.41l-1.966 2.36a.25.25 0 0 1-.384 0l-1.966-2.36A.25.25 0 0 1 11.534 7zm-7.068 2H.534a.25.25 0 0 1-.192-.41L2.308 6.23a.25.25 0 0 1 .384 0l1.966 2.36A.25.25 0 0 1 4.466 9zM8 3a5 5 0 0 1 4.546 2.914.5.5 0 0 0 .908-.418A6 6 0 0 0 2 8c0 .126.004.25.012.375a.5.5 0 0 0 .998-.05A5.002 5.002 0 0 1 8 3zM3.454 10.086a.5.5 0 1 0-.908.418A6 6 0 0 0 14 8a6.06 6.06 0 0 0-.012-.375.5.5 0 0 0-.998.05A5.002 5.002 0 0 1 8 13a5 5 0 0 1-4.546-2.914z" />
            </svg>
            <span className="flex-1">{recurrenceText || 'Set recurrence...'}</span>
          </button>

          {/* Recurrence picker */}
          {showRecurrencePicker && (
            <div className="mt-2 bg-bg-elevated border border-border rounded-xl shadow-md overflow-hidden">
              {buildRecurrencePresets(dueDate).map((preset) => (
                <button
                  key={preset.value}
                  onClick={() => {
                    setRecurrenceText(preset.value)
                    setShowRecurrencePicker(false)
                  }}
                  className={`w-full text-left px-3 py-2.5 text-sm flex items-baseline gap-1.5 transition-colors
                    active:bg-bg-hover
                    ${recurrenceText === preset.value ? 'bg-bg-hover font-medium' : ''}`}
                >
                  <span className="text-text">{preset.label}</span>
                  {preset.detail && <span className="text-text-muted">{preset.detail}</span>}
                </button>
              ))}

              {/* Custom option */}
              {customRecurrence ? (
                <div className="px-3 py-2.5 border-t border-border-subtle">
                  <input
                    autoFocus
                    value={recurrenceText}
                    onChange={e => setRecurrenceText(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') setShowRecurrencePicker(false)
                    }}
                    className="w-full text-sm px-2.5 py-1.5 rounded-lg border border-border bg-bg-input
                               outline-none focus:border-border-focus text-text placeholder:text-text-muted"
                    placeholder="e.g. every 2 weeks"
                  />
                </div>
              ) : (
                <button
                  onClick={() => setCustomRecurrence(true)}
                  className="w-full text-left px-3 py-2.5 text-sm text-text-secondary active:bg-bg-hover transition-colors
                             border-t border-border-subtle"
                >
                  Custom...
                </button>
              )}

              {/* Clear option */}
              {recurrenceText && (
                <button
                  onClick={() => {
                    setRecurrenceText('')
                    setShowRecurrencePicker(false)
                  }}
                  className="w-full text-center px-3 py-2.5 text-sm text-danger active:bg-bg-hover transition-colors
                             border-t border-border-subtle"
                >
                  Remove recurrence
                </button>
              )}
            </div>
          )}
        </div>

        <div className="border-t border-border-subtle" />

        {/* Bottom action */}
        <div className="px-4 py-3 pb-8">
          {isReview ? (
            <button
              onClick={handleDismissReview}
              className="w-full text-center text-sm text-danger active:text-danger/80 py-2"
            >
              Dismiss
            </button>
          ) : (
            <button
              onClick={handleDelete}
              className="w-full text-center text-sm text-danger active:text-danger/80 py-2"
            >
              Delete task
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
