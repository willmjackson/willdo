import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { isOverdue, isToday, isTomorrow, formatRelativeDate } from '../dates'

describe('isOverdue', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-02-18T12:00:00'))
  })
  afterEach(() => { vi.useRealTimers() })

  it('returns false for null', () => {
    expect(isOverdue(null)).toBe(false)
  })

  it('returns true for yesterday', () => {
    expect(isOverdue('2026-02-17')).toBe(true)
  })

  it('returns false for today', () => {
    expect(isOverdue('2026-02-18')).toBe(false)
  })

  it('returns false for tomorrow', () => {
    expect(isOverdue('2026-02-19')).toBe(false)
  })

  it('returns true for a week ago', () => {
    expect(isOverdue('2026-02-11')).toBe(true)
  })
})

describe('isToday', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-02-18T12:00:00'))
  })
  afterEach(() => { vi.useRealTimers() })

  it('returns false for null', () => {
    expect(isToday(null)).toBe(false)
  })

  it('returns true for today', () => {
    expect(isToday('2026-02-18')).toBe(true)
  })

  it('returns false for yesterday', () => {
    expect(isToday('2026-02-17')).toBe(false)
  })
})

describe('isTomorrow', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-02-18T12:00:00'))
  })
  afterEach(() => { vi.useRealTimers() })

  it('returns true for tomorrow', () => {
    expect(isTomorrow('2026-02-19')).toBe(true)
  })

  it('returns false for today', () => {
    expect(isTomorrow('2026-02-18')).toBe(false)
  })
})

describe('formatRelativeDate', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-02-18T12:00:00'))
  })
  afterEach(() => { vi.useRealTimers() })

  it('returns empty for null', () => {
    expect(formatRelativeDate(null)).toBe('')
  })

  it('returns "Today" for today', () => {
    expect(formatRelativeDate('2026-02-18')).toBe('Today')
  })

  it('returns "Tomorrow" for tomorrow', () => {
    expect(formatRelativeDate('2026-02-19')).toBe('Tomorrow')
  })

  it('returns "Yesterday" for yesterday', () => {
    expect(formatRelativeDate('2026-02-17')).toBe('Yesterday')
  })

  it('returns "Nd overdue" for multiple days ago', () => {
    expect(formatRelativeDate('2026-02-15')).toBe('3d overdue')
  })

  it('returns weekday name for dates within 7 days', () => {
    // Feb 18 is Wednesday, so Feb 23 is Monday
    expect(formatRelativeDate('2026-02-23')).toBe('Monday')
  })

  it('returns "Mon, Day" for dates beyond 7 days same year', () => {
    expect(formatRelativeDate('2026-04-15')).toBe('Apr 15')
  })

  it('returns "Mon Day, Year" for different year', () => {
    expect(formatRelativeDate('2027-01-15')).toBe('Jan 15, 2027')
  })
})
