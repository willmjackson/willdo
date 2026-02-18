import * as chrono from 'chrono-node'
import { extractRecurrence } from './recurrence'
import type { ParsedTask } from '../../../shared/types'

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
