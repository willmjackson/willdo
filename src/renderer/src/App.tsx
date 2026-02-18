import { useState, useEffect } from 'react'
import { ViewSwitcher } from './components/ViewSwitcher'
import { TaskInput } from './components/TaskInput'
import { TaskList } from './components/TaskList'
import { ImportDialog } from './components/ImportDialog'
import { useTasks } from './hooks/useTasks'

export default function App() {
  const [view, setView] = useState<'inbox' | 'today'>('inbox')
  const [todayCount, setTodayCount] = useState(0)
  const [showImport, setShowImport] = useState(false)
  const { tasks, loading, refresh, addTask, completeTask, deleteTask, reorderTasks } = useTasks(view)

  useEffect(() => {
    window.api.getDueTodayCount().then(setTodayCount)
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
        <div className="w-48">
          <ViewSwitcher view={view} onViewChange={setView} todayCount={todayCount} />
        </div>
      </div>

      {/* Quick add */}
      <div className="pt-2">
        <TaskInput onAdd={addTask} />
      </div>

      {/* Divider */}
      <div className="border-t border-border" />

      {/* Task list */}
      {loading ? (
        <div className="flex-1 flex items-center justify-center text-text-muted text-sm">
          Loading...
        </div>
      ) : (
        <TaskList
          tasks={tasks}
          onComplete={completeTask}
          onDelete={deleteTask}
          onReorder={reorderTasks}
          view={view}
        />
      )}

      {/* Footer */}
      <div className="border-t border-border px-4 py-2 flex items-center justify-between text-xs text-text-muted shrink-0">
        <span>{tasks.length} task{tasks.length !== 1 ? 's' : ''}</span>
        <button
          onClick={() => setShowImport(true)}
          className="hover:text-text-secondary transition-colors"
        >
          Import from Todoist
        </button>
      </div>

      <ImportDialog
        open={showImport}
        onClose={() => setShowImport(false)}
        onDone={refresh}
      />
    </div>
  )
}
