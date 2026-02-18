export interface RecurrenceResult {
  rrule: string
  rrule_human: string
}

const DAY_MAP: Record<string, string> = {
  monday: 'MO', tuesday: 'TU', wednesday: 'WE', thursday: 'TH',
  friday: 'FR', saturday: 'SA', sunday: 'SU',
  mon: 'MO', tue: 'TU', wed: 'WE', thu: 'TH',
  fri: 'FR', sat: 'SA', sun: 'SU'
}

const MONTH_MAP: Record<string, number> = {
  january: 1, february: 2, march: 3, april: 4, may: 5, june: 6,
  july: 7, august: 8, september: 9, october: 10, november: 11, december: 12,
  jan: 1, feb: 2, mar: 3, apr: 4, jun: 6, jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12
}

type PatternEntry = [RegExp, (m: RegExpMatchArray) => RecurrenceResult]

const patterns: PatternEntry[] = [
  // every day / daily
  [/\b(?:every\s+day|daily)\b/i, (m) => ({
    rrule: 'FREQ=DAILY',
    rrule_human: m[0].toLowerCase()
  })],

  // every N days/weeks/months/years
  [/\bevery\s+(\d+)\s+(day|week|month|year)s?\b/i, (m) => {
    const freq = m[2].toUpperCase() + 'LY'
    return {
      rrule: `FREQ=${freq};INTERVAL=${m[1]}`,
      rrule_human: m[0].toLowerCase()
    }
  }],

  // every other week/month
  [/\bevery\s+other\s+(week|month)\b/i, (m) => ({
    rrule: `FREQ=${m[1].toUpperCase()}LY;INTERVAL=2`,
    rrule_human: m[0].toLowerCase()
  })],

  // every weekday / business days
  [/\b(?:every\s+weekday|business\s+days?)\b/i, (m) => ({
    rrule: 'FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR',
    rrule_human: m[0].toLowerCase()
  })],

  // every Monday (any weekday name)
  [/\bevery\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday|mon|tue|wed|thu|fri|sat|sun)\b/i, (m) => ({
    rrule: `FREQ=WEEKLY;BYDAY=${DAY_MAP[m[1].toLowerCase()]}`,
    rrule_human: m[0].toLowerCase()
  })],

  // every quarter / quarterly
  [/\b(?:every\s+quarter|quarterly)\b/i, (m) => ({
    rrule: 'FREQ=MONTHLY;INTERVAL=3',
    rrule_human: m[0].toLowerCase()
  })],

  // every year / yearly / annually
  [/\b(?:every\s+year|yearly|annually)\b/i, (m) => ({
    rrule: 'FREQ=YEARLY',
    rrule_human: m[0].toLowerCase()
  })],

  // every week / weekly
  [/\b(?:every\s+week|weekly)\b/i, (m) => ({
    rrule: 'FREQ=WEEKLY',
    rrule_human: m[0].toLowerCase()
  })],

  // every month / monthly
  [/\b(?:every\s+month|monthly)\b/i, (m) => ({
    rrule: 'FREQ=MONTHLY',
    rrule_human: m[0].toLowerCase()
  })],

  // every May 13 (specific date yearly)
  [/\bevery\s+(january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|jun|jul|aug|sep|oct|nov|dec)\s+(\d{1,2})\b/i, (m) => ({
    rrule: `FREQ=YEARLY;BYMONTH=${MONTH_MAP[m[1].toLowerCase()]};BYMONTHDAY=${m[2]}`,
    rrule_human: m[0].toLowerCase()
  })],
]

export function extractRecurrence(input: string): { result: RecurrenceResult | null; remainder: string } {
  for (const [re, fn] of patterns) {
    const match = input.match(re)
    if (match) {
      const remainder = input.slice(0, match.index!) + input.slice(match.index! + match[0].length)
      return { result: fn(match), remainder: remainder.replace(/\s{2,}/g, ' ').trim() }
    }
  }
  return { result: null, remainder: input }
}
