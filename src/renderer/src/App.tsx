import React, { useState, useEffect, useCallback, useRef } from 'react'
import { ViewSwitcher } from './components/ViewSwitcher'
import type { ViewType } from './components/ViewSwitcher'
import { TaskInput } from './components/TaskInput'
import { TaskList } from './components/TaskList'
import { TaskEditModal } from './components/TaskEditModal'
import { ImportDialog } from './components/ImportDialog'
import { SettingsModal } from './components/SettingsModal'
import { HistoryView } from './components/HistoryView'
import { useTasks } from './hooks/useTasks'
import { useHistory } from './hooks/useHistory'
import { formatRelativeDate } from './lib/dates'
import type { Task } from '../../shared/types'

interface Toast {
  id: number
  message: string
  exiting: boolean
}

export default function App() {
  const [view, setView] = useState<ViewType>('inbox')
  const [todayCount, setTodayCount] = useState(0)
  const [showImport, setShowImport] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const [toast, setToast] = useState<Toast | null>(null)
  const toastCounter = useRef(0)
  const taskView = view === 'history' ? 'inbox' : view
  const { tasks, loading, refresh, addTask, completeTask, deleteTask, updateTask, reorderTasks, acceptReview, dismissReview } = useTasks(taskView)
  const history = useHistory()

  // Load history when switching to history tab
  useEffect(() => {
    if (view === 'history') history.refresh()
  }, [view, history.refresh])

  const showToast = useCallback((message: string) => {
    const id = ++toastCounter.current
    setToast({ id, message, exiting: false })
    setTimeout(() => {
      setToast(prev => prev?.id === id ? { ...prev, exiting: true } : prev)
      setTimeout(() => {
        setToast(prev => prev?.id === id ? null : prev)
      }, 200)
    }, 2000)
  }, [])

  const handleLaunchClaude = useCallback((task: Task) => {
    window.api.launchClaude(task)
    showToast('Launching Claude Code...')
  }, [showToast])

  const handleComplete = useCallback(async (id: string): Promise<Task> => {
    const task = tasks.find(t => t.id === id)
    const updated = await completeTask(id)
    if (task?.is_recurring && updated?.due_date) {
      showToast(`Done! Next: ${formatRelativeDate(updated.due_date)}`)
    } else {
      showToast('Task completed')
    }
    // Refresh history stats if on history tab
    history.refresh()
    return updated
  }, [tasks, completeTask, showToast, history.refresh])

  const handleAcceptReview = useCallback(async (id: string): Promise<Task> => {
    const updated = await acceptReview(id)
    showToast('Task accepted')
    return updated
  }, [acceptReview, showToast])

  const handleDismissReview = useCallback(async (id: string, comment?: string): Promise<void> => {
    await dismissReview(id, comment)
    showToast('Task dismissed')
  }, [dismissReview, showToast])

  useEffect(() => {
    window.api?.getDueTodayCount().then(setTodayCount)
  }, [tasks])

  useEffect(() => {
    const handleKeydown = (e: KeyboardEvent) => {
      if (e.metaKey && e.key === '1') { e.preventDefault(); setView('inbox') }
      if (e.metaKey && e.key === '2') { e.preventDefault(); setView('today') }
      if (e.metaKey && e.key === '3') { e.preventDefault(); setView('history') }
    }
    window.addEventListener('keydown', handleKeydown)
    return () => window.removeEventListener('keydown', handleKeydown)
  }, [])

  const isHistory = view === 'history'

  return (
    <div className="h-screen flex flex-col select-none">
      {/* Title bar drag region */}
      <div className="drag-region h-12 shrink-0 flex items-end justify-center px-4 pb-1">
        <div className="w-72">
          <ViewSwitcher view={view} onViewChange={setView} todayCount={todayCount} />
        </div>
      </div>

      {isHistory ? (
        <HistoryView
          completions={history.completions}
          stats={history.stats}
          loading={history.loading}
        />
      ) : (
        <>
          {/* Quick add */}
          <div className="pt-2">
            <TaskInput onAdd={addTask} />
          </div>

          {/* Divider */}
          <div className="border-t border-border-subtle" />

          {/* Task list */}
          {loading ? (
            <div className="flex-1 flex items-center justify-center text-text-muted text-sm animate-shimmer">
              Loading...
            </div>
          ) : (
            <TaskList
              tasks={tasks}
              onComplete={handleComplete}
              onDelete={deleteTask}
              onEdit={setEditingTask}
              onLaunchClaude={handleLaunchClaude}
              onReorder={reorderTasks}
              onAcceptReview={handleAcceptReview}
              onDismissReview={handleDismissReview}
              view={taskView}
            />
          )}
        </>
      )}

      {/* Footer */}
      <div className="border-t border-border-subtle px-4 py-2 flex items-center justify-between text-xs text-text-muted shrink-0">
        <span>
          {isHistory
            ? `${history.completions.length} completion${history.completions.length !== 1 ? 's' : ''}`
            : `${tasks.length} task${tasks.length !== 1 ? 's' : ''}`
          }
        </span>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowImport(true)}
            className="hover:text-accent transition-colors"
          >
            Import CSV
          </button>
          <button
            onClick={() => setShowSettings(true)}
            className="hover:text-accent transition-colors"
            title="Settings"
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
              <path d="M8 4.754a3.246 3.246 0 1 0 0 6.492 3.246 3.246 0 0 0 0-6.492zM5.754 8a2.246 2.246 0 1 1 4.492 0 2.246 2.246 0 0 1-4.492 0z" />
              <path d="M9.796 1.343c-.527-1.79-3.065-1.79-3.592 0l-.094.319a.873.873 0 0 1-1.255.52l-.292-.16c-1.64-.892-3.433.902-2.54 2.541l.159.292a.873.873 0 0 1-.52 1.255l-.319.094c-1.79.527-1.79 3.065 0 3.592l.319.094a.873.873 0 0 1 .52 1.255l-.16.292c-.892 1.64.902 3.434 2.541 2.54l.292-.159a.873.873 0 0 1 1.255.52l.094.319c.527 1.79 3.065 1.79 3.592 0l.094-.319a.873.873 0 0 1 1.255-.52l.292.16c1.64.893 3.434-.902 2.54-2.541l-.159-.292a.873.873 0 0 1 .52-1.255l.319-.094c1.79-.527 1.79-3.065 0-3.592l-.319-.094a.873.873 0 0 1-.52-1.255l.16-.292c.893-1.64-.902-3.433-2.541-2.54l-.292.159a.873.873 0 0 1-1.255-.52l-.094-.319zm-2.633.283c.246-.835 1.428-.835 1.674 0l.094.319a1.873 1.873 0 0 0 2.693 1.115l.291-.16c.764-.415 1.6.42 1.184 1.185l-.159.292a1.873 1.873 0 0 0 1.116 2.692l.318.094c.835.246.835 1.428 0 1.674l-.319.094a1.873 1.873 0 0 0-1.115 2.693l.16.291c.415.764-.421 1.6-1.185 1.184l-.291-.159a1.873 1.873 0 0 0-2.693 1.116l-.094.318c-.246.835-1.428.835-1.674 0l-.094-.319a1.873 1.873 0 0 0-2.692-1.115l-.292.16c-.764.415-1.6-.421-1.184-1.185l.159-.291A1.873 1.873 0 0 0 1.945 8.93l-.319-.094c-.835-.246-.835-1.428 0-1.674l.319-.094A1.873 1.873 0 0 0 3.06 4.377l-.16-.292c-.415-.764.421-1.6 1.185-1.184l.292.159a1.873 1.873 0 0 0 2.692-1.116l.094-.318z" />
            </svg>
          </button>
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div className={`fixed bottom-16 left-1/2 -translate-x-1/2 z-50
                          bg-text text-text-inverse text-sm px-4 py-2 rounded-lg
                          shadow-lg ${toast.exiting ? 'animate-toast-out' : 'animate-toast-in'}`}>
          {toast.message}
        </div>
      )}

      {editingTask && (
        <TaskEditModal
          task={editingTask}
          onSave={async (input) => { await updateTask(input); setEditingTask(null) }}
          onDelete={async (id) => { await deleteTask(id); setEditingTask(null) }}
          onClose={() => setEditingTask(null)}
          onAcceptReview={async (id) => { await handleAcceptReview(id); setEditingTask(null) }}
          onDismissReview={async (id, comment?) => { await handleDismissReview(id, comment); setEditingTask(null) }}
        />
      )}

      <ImportDialog
        open={showImport}
        onClose={() => setShowImport(false)}
        onDone={refresh}
      />

      {showSettings && (
        <SettingsModal onClose={() => setShowSettings(false)} />
      )}
    </div>
  )
}
