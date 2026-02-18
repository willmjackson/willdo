import React, { useState, useEffect, useCallback, useRef } from 'react'
import { ViewSwitcher } from './components/ViewSwitcher'
import { TaskInput } from './components/TaskInput'
import { TaskList } from './components/TaskList'
import { TaskEditModal } from './components/TaskEditModal'
import { ImportDialog } from './components/ImportDialog'
import { useTasks } from './hooks/useTasks'
import { formatRelativeDate } from './lib/dates'
import type { Task } from '../../shared/types'

interface Toast {
  id: number
  message: string
  exiting: boolean
}

export default function App() {
  const [view, setView] = useState<'inbox' | 'today'>('inbox')
  const [todayCount, setTodayCount] = useState(0)
  const [showImport, setShowImport] = useState(false)
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const [toast, setToast] = useState<Toast | null>(null)
  const toastCounter = useRef(0)
  const { tasks, loading, refresh, addTask, completeTask, deleteTask, updateTask, reorderTasks } = useTasks(view)

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

  const handleComplete = useCallback(async (id: string): Promise<Task> => {
    const task = tasks.find(t => t.id === id)
    const updated = await completeTask(id)
    if (task?.is_recurring && updated?.due_date) {
      showToast(`Done! Next: ${formatRelativeDate(updated.due_date)}`)
    } else {
      showToast('Task completed')
    }
    return updated
  }, [tasks, completeTask, showToast])

  useEffect(() => {
    window.api?.getDueTodayCount().then(setTodayCount)
  }, [tasks])

  useEffect(() => {
    const handleKeydown = (e: KeyboardEvent) => {
      if (e.metaKey && e.key === '1') { e.preventDefault(); setView('inbox') }
      if (e.metaKey && e.key === '2') { e.preventDefault(); setView('today') }
    }
    window.addEventListener('keydown', handleKeydown)
    return () => window.removeEventListener('keydown', handleKeydown)
  }, [])

  return (
    <div className="h-screen flex flex-col select-none">
      {/* Title bar drag region */}
      <div className="drag-region h-12 shrink-0 flex items-end justify-center px-4 pb-1">
        <div className="w-52">
          <ViewSwitcher view={view} onViewChange={setView} todayCount={todayCount} />
        </div>
      </div>

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
          onReorder={reorderTasks}
          view={view}
        />
      )}

      {/* Footer */}
      <div className="border-t border-border-subtle px-4 py-2 flex items-center justify-between text-xs text-text-muted shrink-0">
        <span>{tasks.length} task{tasks.length !== 1 ? 's' : ''}</span>
        <button
          onClick={() => setShowImport(true)}
          className="hover:text-accent transition-colors"
        >
          Import CSV
        </button>
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
        />
      )}

      <ImportDialog
        open={showImport}
        onClose={() => setShowImport(false)}
        onDone={refresh}
      />
    </div>
  )
}
