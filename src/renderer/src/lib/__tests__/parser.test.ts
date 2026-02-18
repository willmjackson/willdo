import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { parseTaskInput } from '../parser'

describe('parseTaskInput', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-02-18T12:00:00'))
  })
  afterEach(() => { vi.useRealTimers() })

  it('returns empty for blank input', () => {
    const result = parseTaskInput('')
    expect(result.title).toBe('')
    expect(result.due_date).toBeNull()
    expect(result.is_recurring).toBe(false)
  })

  it('parses plain text as title only', () => {
    const result = parseTaskInput('buy groceries')
    expect(result.title).toBe('buy groceries')
    expect(result.due_date).toBeNull()
    expect(result.is_recurring).toBe(false)
  })

  it('parses "tomorrow"', () => {
    const result = parseTaskInput('buy groceries tomorrow')
    expect(result.title).toBe('buy groceries')
    expect(result.due_date).toBe('2026-02-19')
  })

  it('parses "next Friday"', () => {
    const result = parseTaskInput('review report next Friday')
    expect(result.title).toBe('review report')
    // chrono-node: "next Friday" from Wed Feb 18 = Friday after this one = Feb 27
    expect(result.due_date).toBe('2026-02-27')
  })

  it('parses recurrence "every Friday" with computed date', () => {
    const result = parseTaskInput('review pipedrive every Friday')
    expect(result.title).toBe('review pipedrive')
    expect(result.rrule).toBe('FREQ=WEEKLY;BYDAY=FR')
    expect(result.rrule_human).toBe('every friday')
    expect(result.is_recurring).toBe(true)
    // Should compute next Friday as due date
    expect(result.due_date).toBe('2026-02-20')
  })

  it('parses "file sales tax by April 15 every quarter"', () => {
    const result = parseTaskInput('file sales tax by April 15 every quarter')
    expect(result.title).toBe('file sales tax')
    expect(result.due_date).toBe('2026-04-15')
    expect(result.rrule).toBe('FREQ=MONTHLY;INTERVAL=3')
    expect(result.is_recurring).toBe(true)
  })

  it('parses "send email on the 1st of every month"', () => {
    const result = parseTaskInput('send email on the 1st of every month')
    expect(result.title).toBe('send email')
    expect(result.rrule).toContain('FREQ=MONTHLY')
    expect(result.rrule).toContain('BYMONTHDAY=1')
    expect(result.is_recurring).toBe(true)
    // Due date should be March 1 (next 1st, since Feb 18 is past Feb 1)
    expect(result.due_date).toBe('2026-03-01')
  })

  it('strips prepositions before date ("by", "on", "due")', () => {
    const result = parseTaskInput('submit report by Friday')
    expect(result.title).toBe('submit report')
    expect(result.due_date).toBe('2026-02-20')
  })

  it('parses "every month" with no explicit date', () => {
    const result = parseTaskInput('pay rent every month')
    expect(result.title).toBe('pay rent')
    expect(result.rrule).toBe('FREQ=MONTHLY')
    expect(result.is_recurring).toBe(true)
    // Should compute next occurrence from rrule
    expect(result.due_date).not.toBeNull()
  })
})
