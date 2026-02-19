import React, { useState, useEffect, useRef } from 'react'
import { extractRecurrence, formatRelativeDate } from '@willdo/shared'
import type { Task, UpdateTaskInput } from '../../../shared/types'

interface TaskEditModalProps {
  task: Task
  onSave: (input: UpdateTaskInput) => Promise<void>
  onDelete: (id: string) => Promise<void>
  onClose: () => void
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

export function TaskEditModal({ task, onSave, onDelete, onClose }: TaskEditModalProps) {
  const [title, setTitle] = useState(task.title)
  const [dueDate, setDueDate] = useState(task.due_date || '')
  const [recurrenceText, setRecurrenceText] = useState(task.rrule_human || '')
  const [showRecurrencePicker, setShowRecurrencePicker] = useState(false)
  const [customRecurrence, setCustomRecurrence] = useState(false)
  const [saving, setSaving] = useState(false)
  const titleRef = useRef<HTMLTextAreaElement>(null)
  const customRecRef = useRef<HTMLInputElement>(null)

  // Calendar state
  const initialDate = dueDate ? new Date(dueDate + 'T00:00:00') : new Date()
  const [calYear, setCalYear] = useState(initialDate.getFullYear())
  const [calMonth, setCalMonth] = useState(initialDate.getMonth())

  // Auto-resize textarea to fit content (up to max-height)
  const resizeTitle = () => {
    const el = titleRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = el.scrollHeight + 'px'
  }

  useEffect(() => {
    titleRef.current?.focus()
    titleRef.current?.select()
    resizeTitle()
  }, [])

  // Close on Escape — dismiss picker first, then modal
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (showRecurrencePicker) {
          setShowRecurrencePicker(false)
          e.stopPropagation()
        } else {
          onClose()
        }
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [onClose, showRecurrencePicker])

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
  const handleCalToday = () => {
    const now = new Date()
    setCalYear(now.getFullYear())
    setCalMonth(now.getMonth())
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

      const input: UpdateTaskInput = {
        id: task.id,
        title: title.trim() || task.title,
        due_date: dueDate || null,
        rrule: rec.result?.rrule ?? null,
        rrule_human: rec.result?.rrule_human ?? null,
        is_recurring: rec.result !== null,
      }
      await onSave(input)
      onClose()
    } catch (e) {
      console.error('Save failed:', e)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    await onDelete(task.id)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-40 bg-overlay flex items-start justify-center pt-16" onClick={onClose}>
      <div
        className="bg-bg-elevated rounded-xl shadow-lg w-[420px] max-h-[80vh] overflow-hidden animate-in"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 pt-4 pb-2">
          <span className="text-xs text-text-muted font-medium uppercase tracking-wide">Edit Task</span>
          <button onClick={onClose} className="text-text-muted hover:text-text transition-colors">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <path d="M3.72 3.72a.75.75 0 0 1 1.06 0L8 6.94l3.22-3.22a.75.75 0 1 1 1.06 1.06L9.06 8l3.22 3.22a.75.75 0 1 1-1.06 1.06L8 9.06l-3.22 3.22a.75.75 0 0 1-1.06-1.06L6.94 8 3.72 4.78a.75.75 0 0 1 0-1.06z" />
            </svg>
          </button>
        </div>

        {/* Title */}
        <div className="px-4 pb-3">
          <textarea
            ref={titleRef}
            value={title}
            onChange={e => { setTitle(e.target.value); resizeTitle() }}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSave() } }}
            rows={1}
            className="w-full text-base font-medium bg-transparent border-none outline-none resize-none
                       text-text placeholder:text-text-muted overflow-y-auto"
            style={{ maxHeight: 'calc(1.375em * 3 + 2px)' }}
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
              <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" className="text-accent">
                <path d="M4.5 1a.5.5 0 0 1 .5.5V2h6v-.5a.5.5 0 0 1 1 0V2h1.5A1.5 1.5 0 0 1 15 3.5v10a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 1 13.5v-10A1.5 1.5 0 0 1 2.5 2H4v-.5a.5.5 0 0 1 .5-.5zM14 5.5H2v8a.5.5 0 0 0 .5.5h11a.5.5 0 0 0 .5-.5v-8z" />
              </svg>
              <span className="text-text font-medium">{formatRelativeDate(dueDate)}</span>
              <span className="text-text-muted">({dueDate})</span>
            </div>
          )}

          {/* Quick date buttons */}
          <div className="flex gap-1.5 mb-3 flex-wrap">
            {[
              { label: 'Today', key: 'today' as const },
              { label: 'Tomorrow', key: 'tomorrow' as const },
              { label: 'Next week', key: 'next-week' as const },
              { label: 'No date', key: 'none' as const },
            ].map(({ label, key }) => (
              <button
                key={key}
                onClick={() => handleQuickDate(key)}
                className="text-xs px-2.5 py-1 rounded-md border border-border
                           hover:bg-bg-hover hover:border-border-focus transition-colors text-text-secondary"
              >
                {label}
              </button>
            ))}
          </div>

          {/* Calendar */}
          <div className="border border-border rounded-lg p-2.5">
            {/* Month nav */}
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-text">{monthLabel}</span>
              <div className="flex gap-1">
                <button onClick={handleCalPrev} className="text-text-muted hover:text-text p-0.5">
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor"><path d="M10.354 3.354a.5.5 0 0 0-.708-.708l-5 5a.5.5 0 0 0 0 .708l5 5a.5.5 0 0 0 .708-.708L5.707 8l4.647-4.646z"/></svg>
                </button>
                <button onClick={handleCalToday} className="text-xs text-text-muted hover:text-text px-1">
                  <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor"><circle cx="8" cy="8" r="3"/></svg>
                </button>
                <button onClick={handleCalNext} className="text-text-muted hover:text-text p-0.5">
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor"><path d="M5.646 3.354a.5.5 0 0 1 .708-.708l5 5a.5.5 0 0 1 0 .708l-5 5a.5.5 0 0 1-.708-.708L10.293 8 5.646 3.354z"/></svg>
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
                const isToday = iso === todayISO
                return (
                  <button
                    key={i}
                    onClick={() => selectDate(day)}
                    className={`text-xs py-1 rounded-md transition-colors
                      ${isSelected
                        ? 'bg-accent text-text-inverse font-semibold'
                        : isToday
                          ? 'text-accent font-semibold hover:bg-bg-hover'
                          : 'text-text-secondary hover:bg-bg-hover'
                      }`}
                  >
                    {day}
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        <div className="border-t border-border-subtle" />

        {/* Recurrence */}
        <div className="px-4 py-3 relative">
          <div className="text-xs text-text-muted font-medium uppercase tracking-wide mb-2">Recurrence</div>

          {/* Current recurrence display / trigger */}
          <button
            onClick={() => { setShowRecurrencePicker(p => !p); setCustomRecurrence(false) }}
            className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md text-sm text-left transition-colors
              ${recurrenceText
                ? 'bg-recurring text-recurring-text'
                : 'border border-border text-text-muted hover:border-border-focus'
              }`}
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" className="shrink-0">
              <path d="M11.534 7h3.932a.25.25 0 0 1 .192.41l-1.966 2.36a.25.25 0 0 1-.384 0l-1.966-2.36A.25.25 0 0 1 11.534 7zm-7.068 2H.534a.25.25 0 0 1-.192-.41L2.308 6.23a.25.25 0 0 1 .384 0l1.966 2.36A.25.25 0 0 1 4.466 9zM8 3a5 5 0 0 1 4.546 2.914.5.5 0 0 0 .908-.418A6 6 0 0 0 2 8c0 .126.004.25.012.375a.5.5 0 0 0 .998-.05A5.002 5.002 0 0 1 8 3zM3.454 10.086a.5.5 0 1 0-.908.418A6 6 0 0 0 14 8a6.06 6.06 0 0 0-.012-.375.5.5 0 0 0-.998.05A5.002 5.002 0 0 1 8 13a5 5 0 0 1-4.546-2.914z" />
            </svg>
            <span className="flex-1">{recurrenceText || 'Set recurrence...'}</span>
          </button>

          {/* Recurrence picker dropdown */}
          {showRecurrencePicker && (
            <div className="absolute left-4 right-4 bottom-full mb-1 bg-bg-elevated border border-border rounded-lg shadow-lg z-10 overflow-hidden">
              {buildRecurrencePresets(dueDate).map((preset) => (
                <button
                  key={preset.value}
                  onClick={() => {
                    setRecurrenceText(preset.value)
                    setShowRecurrencePicker(false)
                  }}
                  className={`w-full text-left px-3 py-2 text-sm flex items-baseline gap-1.5 transition-colors
                    hover:bg-bg-hover
                    ${recurrenceText === preset.value ? 'bg-bg-hover font-medium' : ''}`}
                >
                  <span className="text-text">{preset.label}</span>
                  {preset.detail && <span className="text-text-muted">{preset.detail}</span>}
                </button>
              ))}

              {/* Custom option */}
              {customRecurrence ? (
                <div className="px-3 py-2 border-t border-border-subtle">
                  <input
                    ref={customRecRef}
                    autoFocus
                    value={recurrenceText}
                    onChange={e => setRecurrenceText(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') setShowRecurrencePicker(false)
                      if (e.key === 'Escape') { setCustomRecurrence(false); e.stopPropagation() }
                    }}
                    className="w-full text-sm px-2 py-1 rounded border border-border bg-bg-input
                               outline-none focus:border-border-focus text-text placeholder:text-text-muted"
                    placeholder="e.g. every 2 weeks, every 3 months"
                  />
                </div>
              ) : (
                <button
                  onClick={() => setCustomRecurrence(true)}
                  className="w-full text-left px-3 py-2 text-sm text-text-secondary hover:bg-bg-hover transition-colors
                             border-t border-border-subtle flex items-center gap-1.5"
                >
                  <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor" className="text-text-muted">
                    <path d="M13.78 4.22a.75.75 0 0 1 0 1.06l-7.25 7.25a.75.75 0 0 1-1.06 0L2.22 9.28a.75.75 0 0 1 1.06-1.06L6 10.94l6.72-6.72a.75.75 0 0 1 1.06 0z" />
                  </svg>
                  Custom...
                </button>
              )}

              {/* Clear option */}
              <button
                onClick={() => {
                  setRecurrenceText('')
                  setShowRecurrencePicker(false)
                }}
                className="w-full text-center px-3 py-2 text-sm text-danger hover:bg-bg-hover transition-colors
                           border-t border-border-subtle"
              >
                Clear
              </button>
            </div>
          )}
        </div>

        <div className="border-t border-border-subtle" />

        {/* Actions */}
        <div className="px-4 py-3 flex items-center justify-between">
          <button
            onClick={handleDelete}
            className="text-xs text-danger hover:text-danger/80 transition-colors"
          >
            Delete task
          </button>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="text-xs px-3 py-1.5 rounded-md border border-border text-text-secondary
                         hover:bg-bg-hover transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="text-xs px-3 py-1.5 rounded-md bg-accent text-text-inverse
                         hover:bg-accent-hover transition-colors disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
