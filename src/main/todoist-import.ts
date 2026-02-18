import { dialog } from 'electron'
import { readFileSync } from 'fs'
import { createTaskFromImport, getNextSortOrder, computeNextOccurrence } from './db'
import type { ImportProgress } from '../shared/types'

function parseRecurrence(dateStr: string): { rrule: string; rrule_human: string } | null {
  const s = dateStr.toLowerCase().trim()

  const freqMap: Record<string, string> = {
    day: 'DAILY', week: 'WEEKLY', month: 'MONTHLY', year: 'YEARLY'
  }
  const dayMap: Record<string, string> = {
    monday: 'MO', tuesday: 'TU', wednesday: 'WE', thursday: 'TH',
    friday: 'FR', saturday: 'SA', sunday: 'SU'
  }

  const patterns: [RegExp, (m: RegExpMatchArray) => string][] = [
    [/^every day$|^daily$/, () => 'FREQ=DAILY'],
    [/^every (\d+) (day|week|month|year)s?$/, (m) => `FREQ=${freqMap[m[2]]};INTERVAL=${m[1]}`],
    [/^every week$|^weekly$/, () => 'FREQ=WEEKLY'],
    [/^every other (week|month)$/, (m) => `FREQ=${freqMap[m[1]]};INTERVAL=2`],
    [/^every (monday|tuesday|wednesday|thursday|friday|saturday|sunday)$/,
      (m) => `FREQ=WEEKLY;BYDAY=${dayMap[m[1]]}`
    ],
    [/^every weekday$|^business days?$/, () => 'FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR'],
    [/^every quarter$|^quarterly$/, () => 'FREQ=MONTHLY;INTERVAL=3'],
    [/^every year$|^yearly$|^annually$/, () => 'FREQ=YEARLY'],
    [/^(?:on )?the (\d{1,2})(?:st|nd|rd|th) of every month$/, (m) => `FREQ=MONTHLY;BYMONTHDAY=${m[1]}`],
    [/^every month on the (\d{1,2})(?:st|nd|rd|th)$/, (m) => `FREQ=MONTHLY;BYMONTHDAY=${m[1]}`],
    [/^every (\d{1,2})(?:st|nd|rd|th) of the month$/, (m) => `FREQ=MONTHLY;BYMONTHDAY=${m[1]}`],
    [/^every month$|^monthly$/, () => 'FREQ=MONTHLY'],
  ]

  for (const [re, fn] of patterns) {
    const match = s.match(re)
    if (match) return { rrule: fn(match), rrule_human: s }
  }
  return null
}

function parseRelativeDate(dateStr: string): string | null {
  const s = dateStr.toLowerCase().trim()

  // "in N days"
  const inDaysMatch = s.match(/^in (\d+) days?$/)
  if (inDaysMatch) {
    const d = new Date()
    d.setDate(d.getDate() + parseInt(inDaysMatch[1]))
    return d.toISOString().split('T')[0]
  }

  // "N days ago"
  const agoMatch = s.match(/^(\d+) days? ago$/)
  if (agoMatch) {
    const d = new Date()
    d.setDate(d.getDate() - parseInt(agoMatch[1]))
    return d.toISOString().split('T')[0]
  }

  return null
}

function parseCSVLine(line: string): string[] {
  const fields: string[] = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"'
        i++
      } else {
        inQuotes = !inQuotes
      }
    } else if (ch === ',' && !inQuotes) {
      fields.push(current)
      current = ''
    } else {
      current += ch
    }
  }
  fields.push(current)
  return fields
}

export async function pickAndImportCSV(): Promise<ImportProgress> {
  const result = await dialog.showOpenDialog({
    title: 'Import Todoist CSV',
    filters: [{ name: 'CSV Files', extensions: ['csv'] }],
    properties: ['openFile']
  })

  if (result.canceled || result.filePaths.length === 0) {
    return { total: 0, imported: 0, skipped: 0, failed: [] }
  }

  return importCSV(result.filePaths[0])
}

export function importCSV(filePath: string): ImportProgress {
  const progress: ImportProgress = { total: 0, imported: 0, skipped: 0, failed: [] }
  // Strip BOM if present
  const raw = readFileSync(filePath, 'utf-8')
  const content = raw.charCodeAt(0) === 0xFEFF ? raw.slice(1) : raw
  const lines = content.split('\n')

  // Find header row
  const headerLine = lines[0]
  const headers = parseCSVLine(headerLine)
  const typeIdx = headers.indexOf('TYPE')
  const contentIdx = headers.indexOf('CONTENT')
  const dateIdx = headers.indexOf('DATE')

  if (typeIdx === -1 || contentIdx === -1) {
    throw new Error('Invalid CSV format: missing TYPE or CONTENT columns')
  }

  let sortOrder = getNextSortOrder()

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim()
    if (!line) continue

    const fields = parseCSVLine(line)
    const type = fields[typeIdx]?.trim()
    const taskContent = fields[contentIdx]?.trim()
    const dateField = dateIdx >= 0 ? fields[dateIdx]?.trim() : ''

    if (type !== 'task' || !taskContent) continue
    progress.total++

    try {
      let dueDate: string | null = null
      let rrule: string | null = null
      let rruleHuman: string | null = null
      let isRecurring = false

      if (dateField) {
        // Try recurrence first
        const rec = parseRecurrence(dateField)
        if (rec) {
          rrule = rec.rrule
          rruleHuman = rec.rrule_human
          isRecurring = true
          // Compute proper first occurrence from the rrule
          dueDate = computeNextOccurrence(rec.rrule)
        } else {
          // Try relative date
          const relDate = parseRelativeDate(dateField)
          if (relDate) {
            dueDate = relDate
          } else {
            progress.failed.push(`${taskContent}: unparseable date "${dateField}"`)
          }
        }
      }

      // Strip markdown links from content: [text](url) → text
      const cleanTitle = taskContent.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')

      createTaskFromImport({
        title: cleanTitle,
        due_date: dueDate,
        rrule,
        rrule_human: rruleHuman,
        is_recurring: isRecurring,
        todoist_id: `csv-${i}`,
        sort_order: sortOrder++
      })
      progress.imported++
    } catch (e: unknown) {
      if (e instanceof Error && e.message === 'duplicate') {
        progress.skipped++
      } else {
        progress.failed.push(`${taskContent}: ${e instanceof Error ? e.message : String(e)}`)
      }
    }
  }

  return progress
}
