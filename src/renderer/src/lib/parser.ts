import * as chrono from 'chrono-node'
import { RRule } from 'rrule'
import { extractRecurrence } from './recurrence'
import type { ParsedTask } from '../../../shared/types'

/**
 * Compute the next occurrence for an rrule string, on or after today.
 */
function computeNextFromRRule(rruleStr: string): string | null {
  try {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const dtstart = today.toISOString().split('T')[0].replace(/-/g, '')
    const rule = RRule.fromString(`DTSTART:${dtstart}T000000Z\nRRULE:${rruleStr}`)
    const next = rule.after(new Date(today.getTime() - 1), true)
    if (next) return next.toISOString().split('T')[0]
  } catch {
    // If parsing fails, return null
  }
  return null
}

export function parseTaskInput(input: string): ParsedTask {
  if (!input.trim()) {
    return { title: '', due_date: null, rrule: null, rrule_human: null, is_recurring: false }
  }

  // Stage 1: Extract recurrence pattern
  const { result: recurrence, remainder: afterRecurrence } = extractRecurrence(input)

  // Stage 2: Extract date with chrono-node
  const parsed = chrono.parse(afterRecurrence, new Date(), { forwardDate: true })
  let dueDate: string | null = null
  let afterDate = afterRecurrence

  if (parsed.length > 0) {
    const match = parsed[0]
    const date = match.start.date()
    dueDate = date.toISOString().split('T')[0]

    // Remove the date text and surrounding prepositions
    const before = afterDate.slice(0, match.index)
    const after = afterDate.slice(match.index + match.text.length)

    // Clean up prepositions that preceded the date (by, on, due, for)
    const cleanBefore = before.replace(/\s+(?:by|on|due|for)\s*$/i, ' ')
    afterDate = (cleanBefore + after).replace(/\s{2,}/g, ' ').trim()
  }

  // Stage 2b: If recurring but no explicit date, compute first occurrence from rrule
  if (recurrence && !dueDate) {
    dueDate = computeNextFromRRule(recurrence.rrule)
  }

  // Stage 3: Clean up the title
  const title = afterDate.replace(/\s{2,}/g, ' ').trim()

  return {
    title,
    due_date: dueDate,
    rrule: recurrence?.rrule ?? null,
    rrule_human: recurrence?.rrule_human ?? null,
    is_recurring: recurrence !== null
  }
}
