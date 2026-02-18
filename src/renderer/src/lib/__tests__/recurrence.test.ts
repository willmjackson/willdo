import { describe, it, expect } from 'vitest'
import { extractRecurrence } from '../recurrence'

describe('extractRecurrence', () => {
  it('extracts "every day"', () => {
    const { result, remainder } = extractRecurrence('water plants every day')
    expect(result).toEqual({ rrule: 'FREQ=DAILY', rrule_human: 'every day' })
    expect(remainder).toBe('water plants')
  })

  it('extracts "daily"', () => {
    const { result, remainder } = extractRecurrence('take vitamins daily')
    expect(result).toEqual({ rrule: 'FREQ=DAILY', rrule_human: 'daily' })
    expect(remainder).toBe('take vitamins')
  })

  it('extracts "every N days"', () => {
    const { result } = extractRecurrence('check pool every 3 days')
    expect(result).toEqual({ rrule: 'FREQ=DAILY;INTERVAL=3', rrule_human: 'every 3 days' })
  })

  it('extracts "every week"', () => {
    const { result } = extractRecurrence('review pipedrive every week')
    expect(result).toEqual({ rrule: 'FREQ=WEEKLY', rrule_human: 'every week' })
  })

  it('extracts "weekly"', () => {
    const { result } = extractRecurrence('weekly standup')
    expect(result).toEqual({ rrule: 'FREQ=WEEKLY', rrule_human: 'weekly' })
  })

  it('extracts "every Friday"', () => {
    const { result, remainder } = extractRecurrence('review pipedrive every Friday')
    expect(result).toEqual({ rrule: 'FREQ=WEEKLY;BYDAY=FR', rrule_human: 'every friday' })
    expect(remainder).toBe('review pipedrive')
  })

  it('extracts "every other week"', () => {
    const { result } = extractRecurrence('1:1 with Alex every other week')
    expect(result).toEqual({ rrule: 'FREQ=WEEKLY;INTERVAL=2', rrule_human: 'every other week' })
  })

  it('extracts "every month"', () => {
    const { result } = extractRecurrence('pay rent every month')
    expect(result).toEqual({ rrule: 'FREQ=MONTHLY', rrule_human: 'every month' })
  })

  it('extracts "monthly"', () => {
    const { result } = extractRecurrence('monthly payroll')
    expect(result).toEqual({ rrule: 'FREQ=MONTHLY', rrule_human: 'monthly' })
  })

  it('extracts "every quarter"', () => {
    const { result } = extractRecurrence('file sales tax every quarter')
    expect(result).toEqual({ rrule: 'FREQ=MONTHLY;INTERVAL=3', rrule_human: 'every quarter' })
  })

  it('extracts "quarterly"', () => {
    const { result } = extractRecurrence('quarterly review')
    expect(result).toEqual({ rrule: 'FREQ=MONTHLY;INTERVAL=3', rrule_human: 'quarterly' })
  })

  it('extracts "every year"', () => {
    const { result } = extractRecurrence('renew insurance every year')
    expect(result).toEqual({ rrule: 'FREQ=YEARLY', rrule_human: 'every year' })
  })

  it('extracts "every weekday"', () => {
    const { result } = extractRecurrence('check email every weekday')
    expect(result).toEqual({ rrule: 'FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR', rrule_human: 'every weekday' })
  })

  it('extracts "every May 13"', () => {
    const { result } = extractRecurrence('birthday party every May 13')
    expect(result).toEqual({
      rrule: 'FREQ=YEARLY;BYMONTH=5;BYMONTHDAY=13',
      rrule_human: 'every may 13'
    })
  })

  // The bug: "on the 1st of every month" should capture the day-of-month
  it('extracts "on the 1st of every month"', () => {
    const { result, remainder } = extractRecurrence('send an email on the 1st of every month')
    expect(result?.rrule).toBe('FREQ=MONTHLY;BYMONTHDAY=1')
    expect(remainder).toBe('send an email')
  })

  it('extracts "on the 15th of every month"', () => {
    const { result, remainder } = extractRecurrence('pay rent on the 15th of every month')
    expect(result?.rrule).toBe('FREQ=MONTHLY;BYMONTHDAY=15')
    expect(remainder).toBe('pay rent')
  })

  it('extracts "every month on the 1st"', () => {
    const { result, remainder } = extractRecurrence('send invoice every month on the 1st')
    expect(result?.rrule).toBe('FREQ=MONTHLY;BYMONTHDAY=1')
    expect(remainder).toBe('send invoice')
  })

  it('extracts "every 2nd of the month"', () => {
    const { result, remainder } = extractRecurrence('check accounts every 2nd of the month')
    expect(result?.rrule).toBe('FREQ=MONTHLY;BYMONTHDAY=2')
    expect(remainder).toBe('check accounts')
  })

  it('returns null for no recurrence', () => {
    const { result, remainder } = extractRecurrence('buy groceries tomorrow')
    expect(result).toBeNull()
    expect(remainder).toBe('buy groceries tomorrow')
  })

  it('handles case insensitivity', () => {
    const { result } = extractRecurrence('Review pipedrive EVERY FRIDAY')
    expect(result?.rrule).toBe('FREQ=WEEKLY;BYDAY=FR')
  })
})
