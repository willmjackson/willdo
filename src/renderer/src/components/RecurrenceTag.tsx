import React from 'react'

interface RecurrenceTagProps {
  rruleHuman: string
}

function getRecurrenceColors(text: string): { bg: string; fg: string } {
  const t = text.toLowerCase()
  if (t.includes('day') || t === 'daily' || t.includes('weekday') || t.includes('business'))
    return { bg: 'bg-rec-daily', fg: 'text-rec-daily-text' }
  if (t.includes('year') || t.includes('annual'))
    return { bg: 'bg-rec-yearly', fg: 'text-rec-yearly-text' }
  if (t.includes('quarter') || t.includes('3 month'))
    return { bg: 'bg-rec-quarterly', fg: 'text-rec-quarterly-text' }
  if (t.includes('month') || /\d+(?:st|nd|rd|th)\s+of\s+every/.test(t))
    return { bg: 'bg-rec-monthly', fg: 'text-rec-monthly-text' }
  // Default: weekly (includes "every friday", "every week", "every 2 weeks", etc.)
  return { bg: 'bg-rec-weekly', fg: 'text-rec-weekly-text' }
}

export function RecurrenceTag({ rruleHuman }: RecurrenceTagProps) {
  const { bg, fg } = getRecurrenceColors(rruleHuman)

  return (
    <span className={`inline-flex items-center gap-1 text-xs ${fg} ${bg} rounded-md px-1.5 py-0.5`}>
      <svg width="10" height="10" viewBox="0 0 16 16" fill="currentColor">
        <path d="M11.534 7h3.932a.25.25 0 0 1 .192.41l-1.966 2.36a.25.25 0 0 1-.384 0l-1.966-2.36a.25.25 0 0 1 .192-.41zm-11 2h3.932a.25.25 0 0 0 .192-.41L2.692 6.23a.25.25 0 0 0-.384 0L.342 8.59A.25.25 0 0 0 .534 9z" />
        <path fillRule="evenodd" d="M8 3a5 5 0 1 0 4.546 2.914.5.5 0 0 1 .908-.417A6 6 0 1 1 8 2v1z" />
        <path d="M8 4.466V.534a.25.25 0 0 1 .41-.192l2.36 1.966c.12.1.12.284 0 .384L8.41 4.658A.25.25 0 0 1 8 4.466z" />
      </svg>
      {rruleHuman}
    </span>
  )
}
