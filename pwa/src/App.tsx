import { useState, useEffect } from 'react'
import { isConfigured, clearConfig, type SyncTask } from './lib/api'
import { useTasks } from './hooks/useTasks'
import { SetupScreen } from './components/SetupScreen'
import { TaskInput } from './components/TaskInput'
import { TaskList } from './components/TaskList'
import { TaskEditModal } from './components/TaskEditModal'

export default function App() {
  const [configured, setConfigured] = useState(isConfigured())

  if (!configured) {
    return <SetupScreen onComplete={() => setConfigured(true)} />
  }

  return <MainView onDisconnect={() => { clearConfig(); setConfigured(false) }} />
}

function MainView({ onDisconnect }: { onDisconnect: () => void }) {
  const { tasks, loading, error, refresh, addTask, completeTask, deleteTask, updateTask, acceptReview, dismissReview } = useTasks()
  const [isOnline, setIsOnline] = useState(navigator.onLine)
  const [editingTask, setEditingTask] = useState<SyncTask | null>(null)

  // Track online status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  return (
    <div className="h-[100dvh] flex flex-col">
      {/* Header */}
      <div className="shrink-0 px-4 pt-3 pb-2 flex items-center justify-between">
        <h1 className="text-lg font-bold text-text">WillDo</h1>
        <div className="flex items-center gap-2">
          {!isOnline && (
            <span className="text-[11px] px-2 py-0.5 rounded-full bg-danger-subtle text-danger font-medium">
              Offline
            </span>
          )}
          <button
            onClick={refresh}
            className="text-text-muted active:text-accent transition-colors p-1"
            title="Refresh"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <path d="M11.534 7h3.932a.25.25 0 0 1 .192.41l-1.966 2.36a.25.25 0 0 1-.384 0l-1.966-2.36A.25.25 0 0 1 11.534 7zm-7.068 2H.534a.25.25 0 0 1-.192-.41L2.308 6.23a.25.25 0 0 1 .384 0l1.966 2.36A.25.25 0 0 1 4.466 9zM8 3a5 5 0 0 1 4.546 2.914.5.5 0 0 0 .908-.418A6 6 0 0 0 2 8c0 .126.004.25.012.375a.5.5 0 0 0 .998-.05A5.002 5.002 0 0 1 8 3zM3.454 10.086a.5.5 0 1 0-.908.418A6 6 0 0 0 14 8a6.06 6.06 0 0 0-.012-.375.5.5 0 0 0-.998.05A5.002 5.002 0 0 1 8 13a5 5 0 0 1-4.546-2.914z" />
            </svg>
          </button>
        </div>
      </div>

      {/* Task input */}
      <TaskInput onAdd={addTask} />

      {/* Divider */}
      <div className="border-t border-border-subtle" />

      {/* Task list */}
      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="w-5 h-5 border-2 border-border border-t-accent rounded-full animate-spin" />
        </div>
      ) : error ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-3 p-6">
          <p className="text-sm text-danger text-center">{error}</p>
          <button
            onClick={refresh}
            className="text-sm px-4 py-1.5 rounded-lg bg-accent text-text-inverse active:bg-accent-hover"
          >
            Retry
          </button>
        </div>
      ) : (
        <TaskList tasks={tasks} onComplete={completeTask} onDelete={deleteTask} onEdit={setEditingTask} onAcceptReview={acceptReview} onDismissReview={dismissReview} />
      )}

      {/* Footer */}
      <div className="border-t border-border-subtle px-4 py-2 flex items-center justify-between text-xs text-text-muted shrink-0">
        <span>{tasks.length} task{tasks.length !== 1 ? 's' : ''}</span>
        <button
          onClick={onDisconnect}
          className="text-text-muted active:text-danger transition-colors"
        >
          Disconnect
        </button>
      </div>

      {/* Edit modal */}
      {editingTask && (
        <TaskEditModal
          task={editingTask}
          onSave={updateTask}
          onDelete={deleteTask}
          onClose={() => setEditingTask(null)}
          onAcceptReview={async (id) => { await acceptReview(id); setEditingTask(null) }}
          onDismissReview={async (id) => { await dismissReview(id); setEditingTask(null) }}
        />
      )}
    </div>
  )
}
