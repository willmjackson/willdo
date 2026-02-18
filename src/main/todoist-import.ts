import { createTaskFromImport, getNextSortOrder } from './db'
import type { ImportProgress } from '../shared/types'

// Recurrence patterns matching (subset for Todoist imports)
function parseRecurrence(dueString: string): { rrule: string; rrule_human: string } | null {
  const s = dueString.toLowerCase().trim()

  const patterns: [RegExp, (m: RegExpMatchArray) => string][] = [
    [/^every day$|^daily$/, () => 'FREQ=DAILY'],
    [/^every (\d+) days?$/, (m) => `FREQ=DAILY;INTERVAL=${m[1]}`],
    [/^every week$|^weekly$/, () => 'FREQ=WEEKLY'],
    [/^every (\d+) weeks?$/, (m) => `FREQ=WEEKLY;INTERVAL=${m[1]}`],
    [/^every other week$/, () => 'FREQ=WEEKLY;INTERVAL=2'],
    [/^every month$|^monthly$/, () => 'FREQ=MONTHLY'],
    [/^every (\d+) months?$/, (m) => `FREQ=MONTHLY;INTERVAL=${m[1]}`],
    [/^every quarter$|^quarterly$/, () => 'FREQ=MONTHLY;INTERVAL=3'],
    [/^every year$|^yearly$|^annually$/, () => 'FREQ=YEARLY'],
    [/^every (monday|tuesday|wednesday|thursday|friday|saturday|sunday)$/,
      (m) => {
        const dayMap: Record<string, string> = {
          monday: 'MO', tuesday: 'TU', wednesday: 'WE', thursday: 'TH',
          friday: 'FR', saturday: 'SA', sunday: 'SU'
        }
        return `FREQ=WEEKLY;BYDAY=${dayMap[m[1]]}`
      }
    ],
    [/^every weekday$|^business days?$/, () => 'FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR'],
  ]

  for (const [re, fn] of patterns) {
    const match = s.match(re)
    if (match) {
      return { rrule: fn(match), rrule_human: s }
    }
  }
  return null
}

export async function importFromTodoist(token: string): Promise<ImportProgress> {
  const progress: ImportProgress = { total: 0, imported: 0, skipped: 0, failed: [] }

  const res = await fetch('https://api.todoist.com/rest/v2/tasks', {
    headers: { Authorization: `Bearer ${token}` }
  })

  if (!res.ok) {
    throw new Error(`Todoist API error: ${res.status} ${res.statusText}`)
  }

  const tasks = await res.json()
  progress.total = tasks.length
  let sortOrder = getNextSortOrder()

  for (const t of tasks) {
    try {
      let dueDate: string | null = null
      let rrule: string | null = null
      let rruleHuman: string | null = null
      let isRecurring = false

      if (t.due) {
        dueDate = t.due.date
        if (t.due.is_recurring && t.due.string) {
          const parsed = parseRecurrence(t.due.string)
          if (parsed) {
            rrule = parsed.rrule
            rruleHuman = parsed.rrule_human
            isRecurring = true
          } else {
            progress.failed.push(`${t.content}: unparseable recurrence "${t.due.string}"`)
          }
        }
      }

      createTaskFromImport({
        title: t.content,
        due_date: dueDate,
        rrule,
        rrule_human: rruleHuman,
        is_recurring: isRecurring,
        todoist_id: String(t.id),
        sort_order: sortOrder++
      })
      progress.imported++
    } catch (e: unknown) {
      if (e instanceof Error && e.message === 'duplicate') {
        progress.skipped++
      } else {
        progress.failed.push(`${t.content}: ${e instanceof Error ? e.message : String(e)}`)
      }
    }
  }

  return progress
}
