import React from 'react'
import type { CompletedTaskRow, CompletionStats } from '../../../shared/types'

interface HistoryViewProps {
  completions: CompletedTaskRow[]
  stats: CompletionStats
  loading: boolean
}

function formatRelativeTime(dateStr: string): string {
  const now = new Date()
  const date = new Date(dateStr + 'Z') // completions stored as UTC
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  if (diffMins < 1) return 'just now'
  if (diffMins < 60) return `${diffMins}m ago`
  const diffHours = Math.floor(diffMins / 60)
  if (diffHours < 24) return `${diffHours}h ago`
  const diffDays = Math.floor(diffHours / 24)
  if (diffDays === 1) return 'yesterday'
  if (diffDays < 7) return `${diffDays}d ago`
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function groupCompletions(completions: CompletedTaskRow[]): { label: string; items: CompletedTaskRow[] }[] {
  const now = new Date()
  const todayStr = now.toISOString().split('T')[0]

  const yesterday = new Date(now)
  yesterday.setDate(yesterday.getDate() - 1)
  const yesterdayStr = yesterday.toISOString().split('T')[0]

  // Start of this week (Sunday)
  const weekStart = new Date(now)
  weekStart.setDate(weekStart.getDate() - weekStart.getDay())
  const weekStartStr = weekStart.toISOString().split('T')[0]

  const groups: Record<string, CompletedTaskRow[]> = {
    Today: [],
    Yesterday: [],
    'This Week': [],
    Earlier: []
  }

  for (const c of completions) {
    const dateStr = c.completed_at.split('T')[0]
    if (dateStr === todayStr) groups.Today.push(c)
    else if (dateStr === yesterdayStr) groups.Yesterday.push(c)
    else if (dateStr >= weekStartStr) groups['This Week'].push(c)
    else groups.Earlier.push(c)
  }

  return Object.entries(groups)
    .filter(([, items]) => items.length > 0)
    .map(([label, items]) => ({ label, items }))
}

function getRecurrenceColor(rruleHuman: string | null): { bg: string; text: string } {
  if (!rruleHuman) return { bg: 'bg-recurring', text: 'text-recurring-text' }
  const lower = rruleHuman.toLowerCase()
  if (lower.includes('day') || lower.includes('daily')) return { bg: 'bg-rec-daily', text: 'text-rec-daily-text' }
  if (lower.includes('month')) return { bg: 'bg-rec-monthly', text: 'text-rec-monthly-text' }
  if (lower.includes('quarter')) return { bg: 'bg-rec-quarterly', text: 'text-rec-quarterly-text' }
  if (lower.includes('year') || lower.includes('annual')) return { bg: 'bg-rec-yearly', text: 'text-rec-yearly-text' }
  return { bg: 'bg-recurring', text: 'text-recurring-text' }
}

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className={`rounded-lg px-3 py-2 ${color}`}>
      <div className="text-lg font-semibold">{value}</div>
      <div className="text-xs opacity-70">{label}</div>
    </div>
  )
}

export function HistoryView({ completions, stats, loading }: HistoryViewProps) {
  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center text-text-muted text-sm animate-shimmer">
        Loading...
      </div>
    )
  }

  const groups = groupCompletions(completions)

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Stats banner */}
      <div className="px-4 pt-3 pb-2">
        <div className="grid grid-cols-4 gap-2">
          <StatCard label="Today" value={stats.today} color="bg-success-subtle text-success" />
          <StatCard label="This Week" value={stats.thisWeek} color="bg-warning-subtle text-warning" />
          <StatCard label="All Time" value={stats.total} color="bg-accent-subtle text-accent" />
          <StatCard label="With Claude" value={stats.claudeAssisted} color="bg-claude text-claude-text" />
        </div>
      </div>

      {/* Divider */}
      <div className="border-t border-border-subtle" />

      {/* Completion list */}
      <div className="flex-1 overflow-y-auto">
        {groups.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-text-muted text-sm gap-2">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12,6 12,12 16,14" />
            </svg>
            <span>No completions yet</span>
            <span className="text-xs">Complete tasks to see them here</span>
          </div>
        ) : (
          <div className="py-1">
            {groups.map(group => (
              <div key={group.label}>
                <div className="px-4 py-1.5 text-xs font-medium text-text-muted uppercase tracking-wider">
                  {group.label}
                </div>
                {group.items.map(c => {
                  const recColor = c.is_recurring ? getRecurrenceColor(c.rrule_human) : null
                  return (
                    <div
                      key={c.completion_id}
                      className="flex items-center gap-2.5 px-4 py-2 hover:bg-bg-hover transition-colors"
                    >
                      {/* Green checkmark */}
                      <svg width="16" height="16" viewBox="0 0 16 16" className="shrink-0 text-success">
                        <circle cx="8" cy="8" r="7" fill="currentColor" opacity="0.15" />
                        <path d="M5 8l2 2 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                      </svg>

                      {/* Title + badges */}
                      <div className="flex-1 min-w-0 flex items-center gap-2">
                        <span className="text-sm text-text truncate">{c.title}</span>
                        {c.launched_with_claude === 1 && (
                          <span className="shrink-0 inline-flex items-center gap-1 text-[10px] font-medium bg-claude text-claude-text rounded-full px-1.5 py-0.5">
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
                              <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
                            </svg>
                            Claude
                          </span>
                        )}
                        {c.is_recurring === 1 && recColor && (
                          <span className={`shrink-0 text-[10px] font-medium rounded-full px-1.5 py-0.5 ${recColor.bg} ${recColor.text}`}>
                            {c.rrule_human || 'recurring'}
                          </span>
                        )}
                      </div>

                      {/* Relative time */}
                      <span className="shrink-0 text-xs text-text-muted">
                        {formatRelativeTime(c.completed_at)}
                      </span>
                    </div>
                  )
                })}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
