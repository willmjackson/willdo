import { app, ipcMain } from 'electron'
import { spawn } from 'child_process'
import { writeFileSync, chmodSync } from 'fs'
import { tmpdir } from 'os'
import path from 'path'
import { pushTasks } from './sync'
import {
  listTasks,
  createTask,
  updateTask,
  completeTask,
  deleteTask,
  reorderTask,
  searchTasks,
  getDueTodayCount,
  getSetting,
  setSetting,
  markClaudeLaunched,
  listCompletedTasks,
  getCompletionStats,
  acceptReview,
  dismissReview,
  logReviewEdit,
  listReviewFeedback
} from './db'
import { pickAndImportCSV } from './todoist-import'
import { pushTasks } from './sync'
import type { CreateTaskInput, UpdateTaskInput, Task } from '../shared/types'

function buildClaudePrompt(task: Task): string {
  const lines: string[] = []

  lines.push('# Task from WillDo')
  lines.push('')
  lines.push(`**Title:** ${task.title}`)
  if (task.due_date) lines.push(`**Due:** ${task.due_date}`)
  if (task.is_recurring && task.rrule_human) lines.push(`**Recurrence:** ${task.rrule_human}`)
  lines.push('')

  lines.push('## Step 1: SMART Goal Review')
  lines.push('')
  lines.push('Before doing anything, review this task against the SMART framework:')
  lines.push('- **Specific** — Is the task clearly defined? What exactly needs to be done?')
  lines.push('- **Measurable** — How will we know it\'s complete? What\'s the deliverable?')
  lines.push('- **Achievable** — Can this be done in a single session?')
  lines.push('- **Relevant** — Does the task make sense in context?')
  lines.push('- **Time-bound** — Is there a deadline or time constraint?')
  lines.push('')
  lines.push('Present a refined version of the task and ask the user to confirm before proceeding.')
  lines.push('')

  lines.push('## Step 2: Identify Resources')
  lines.push('')
  lines.push('Once the user confirms the refined task, identify relevant resources:')
  lines.push('- Check `~/.claude/skills/` for relevant Claude Code skills')
  lines.push('- Check `~/.claude/settings.json` for configured MCP servers')
  lines.push('- Check `~/code/` for relevant repositories')
  lines.push('- Note any tools, APIs, or services that may be needed')
  lines.push('')

  lines.push('## Step 3: Execute')
  lines.push('')
  lines.push('Proceed to execute the refined task using the identified resources.')

  return lines.join('\n')
}

function updateDockBadge(): void {
  const count = getDueTodayCount()
  app.dock?.setBadge(count > 0 ? String(count) : '')
}

export function registerIpcHandlers(): void {
  ipcMain.handle('tasks:list', (_event, view: 'inbox' | 'today') => {
    return listTasks(view)
  })

  ipcMain.handle('tasks:create', (_event, input: CreateTaskInput) => {
    const task = createTask(input)
    updateDockBadge()
    pushTasks().catch(console.error)
    return task
  })

  ipcMain.handle('tasks:update', (_event, input: UpdateTaskInput) => {
    const task = updateTask(input)
    updateDockBadge()
    pushTasks().catch(console.error)
    return task
  })

  ipcMain.handle('tasks:complete', (_event, id: string) => {
    const task = completeTask(id)
    updateDockBadge()
    pushTasks().catch(console.error)
    return task
  })

  ipcMain.handle('tasks:delete', (_event, id: string) => {
    deleteTask(id)
    updateDockBadge()
    pushTasks().catch(console.error)
  })

  ipcMain.handle('tasks:reorder', (_event, id: string, newOrder: number) => {
    reorderTask(id, newOrder)
    pushTasks().catch(console.error)
  })

  ipcMain.handle('tasks:search', (_event, query: string) => {
    return searchTasks(query)
  })

  ipcMain.handle('tasks:due-today-count', () => {
    return getDueTodayCount()
  })

  ipcMain.handle('todoist:import-csv', () => {
    const result = pickAndImportCSV()
    updateDockBadge()
    return result
  })

  ipcMain.handle('claude:launch', (_event, task: Task) => {
    markClaudeLaunched(task.id)
    const terminalApp = getSetting('terminal_app') || '/System/Applications/Utilities/Terminal.app'
    const claudePath = getSetting('claude_path') || '/opt/homebrew/bin/claude'
    const prompt = buildClaudePrompt(task)

    // Write prompt to temp file, then a launcher script that reads it.
    // This avoids all shell escaping issues with special chars in task titles.
    const ts = Date.now()
    const promptPath = path.join(tmpdir(), `willdo-prompt-${ts}.md`)
    const scriptPath = path.join(tmpdir(), `willdo-launch-${ts}.sh`)

    writeFileSync(promptPath, prompt)
    writeFileSync(scriptPath, [
      '#!/bin/zsh -l',
      `prompt=$(cat "${promptPath}")`,
      `rm -f "${promptPath}" "${scriptPath}"`,
      `cd ~`,
      `exec "${claudePath}" "$prompt"`
    ].join('\n'))
    chmodSync(scriptPath, 0o755)

    if (terminalApp.includes('Terminal.app')) {
      // Terminal.app doesn't support -e; use AppleScript
      const child = spawn('osascript', [
        '-e', 'tell application "Terminal" to activate',
        '-e', `tell application "Terminal" to do script "${scriptPath}"`
      ], { detached: true, stdio: 'ignore' })
      child.unref()
    } else if (terminalApp.includes('Ghostty.app')) {
      // Ghostty is single-instance — calling its CLI binary directly
      // creates a new window in the running instance (or launches if not running)
      const ghosttyBin = terminalApp.replace(/\.app\/?$/, '.app/Contents/MacOS/ghostty')
      const child = spawn(ghosttyBin, ['-e', scriptPath], {
        detached: true,
        stdio: 'ignore'
      })
      child.unref()
    } else {
      // Warp and others: use open -a (not -na to avoid instance conflicts)
      const child = spawn('open', ['-a', terminalApp, '--args', '-e', scriptPath], {
        detached: true,
        stdio: 'ignore'
      })
      child.unref()
    }
  })

  // Review handlers
  ipcMain.handle('review:accept', (_event, id: string) => {
    const task = acceptReview(id)
    updateDockBadge()
    pushTasks().catch(console.error)
    return task
  })

  ipcMain.handle('review:dismiss', (_event, id: string, comment?: string) => {
    dismissReview(id, comment)
    updateDockBadge()
    pushTasks().catch(console.error)
  })

  ipcMain.handle('review:feedback', (_event, limit?: number) => {
    return listReviewFeedback(limit)
  })

  ipcMain.handle('history:list', (_event, limit?: number) => {
    return listCompletedTasks(limit)
  })

  ipcMain.handle('history:stats', () => {
    return getCompletionStats()
  })

  ipcMain.handle('settings:get', (_event, key: string) => {
    return getSetting(key)
  })

  ipcMain.handle('settings:set', (_event, key: string, value: string) => {
    setSetting(key, value)
  })

  // Set initial badge on startup
  updateDockBadge()
}
