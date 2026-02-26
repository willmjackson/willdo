import { useState } from 'react'
import { isOverdue, isToday } from '@willdo/shared'
import type { SyncTask } from '../lib/api'
import { TaskItem } from './TaskItem'
import { ReviewTaskItem } from './ReviewTaskItem'

interface TaskListProps {
  tasks: SyncTask[]
  onComplete: (id: string) => void
  onDelete: (id: string) => void
  onEdit: (task: SyncTask) => void
  onAcceptReview: (id: string) => Promise<void>
  onDismissReview: (id: string) => Promise<void>
}

interface TaskGroup {
  label: string
  tasks: SyncTask[]
}

function groupTasks(tasks: SyncTask[]): TaskGroup[] {
  const noDate: SyncTask[] = []
  const overdue: SyncTask[] = []
  const todayTasks: SyncTask[] = []
  const upcoming: SyncTask[] = []

  for (const task of tasks) {
    if (!task.due_date) {
      noDate.push(task)
    } else if (isOverdue(task.due_date)) {
      overdue.push(task)
    } else if (isToday(task.due_date)) {
      todayTasks.push(task)
    } else {
      upcoming.push(task)
    }
  }

  const groups: TaskGroup[] = []
  if (noDate.length) groups.push({ label: 'No date', tasks: noDate })
  if (overdue.length) groups.push({ label: 'Overdue', tasks: overdue })
  if (todayTasks.length) groups.push({ label: 'Today', tasks: todayTasks })
  if (upcoming.length) groups.push({ label: 'Upcoming', tasks: upcoming })
  return groups
}

export function TaskList({ tasks, onComplete, onDelete, onEdit, onAcceptReview, onDismissReview }: TaskListProps) {
  const [reviewCollapsed, setReviewCollapsed] = useState(false)

  const reviewTasks = tasks.filter(t => t.status === 'review')
  const activeTasks = tasks.filter(t => t.status !== 'review')

  if (tasks.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-text-muted text-sm p-8">
        No tasks yet
      </div>
    )
  }

  const groups = groupTasks(activeTasks)

  return (
    <div className="flex-1 overflow-y-auto">
      {/* Review section */}
      {reviewTasks.length > 0 && (
        <div className="border-b-2 border-review-border/30">
          <button
            onClick={() => setReviewCollapsed(c => !c)}
            className="w-full flex items-center gap-2 px-4 py-2 text-xs font-medium uppercase tracking-wide text-review-text active:bg-review/50 transition-colors"
          >
            <svg
              width="10" height="10" viewBox="0 0 16 16" fill="currentColor"
              className={`transition-transform ${reviewCollapsed ? '-rotate-90' : ''}`}
            >
              <path d="M4.646 5.646a.5.5 0 0 1 .708 0L8 8.293l2.646-2.647a.5.5 0 0 1 .708.708l-3 3a.5.5 0 0 1-.708 0l-3-3a.5.5 0 0 1 0-.708z" />
            </svg>
            <span>For Review</span>
            <span className="text-[10px] rounded-full px-1.5 py-0.5 min-w-[18px] text-center bg-review-accent text-text-inverse font-semibold">
              {reviewTasks.length}
            </span>
          </button>

          {!reviewCollapsed && (
            <div>
              {reviewTasks.map(task => (
                <ReviewTaskItem
                  key={task.id}
                  task={task}
                  onAccept={onAcceptReview}
                  onDismiss={onDismissReview}
                  onEdit={onEdit}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Active tasks grouped by date */}
      {groups.map((group) => (
        <div key={group.label}>
          <div className="px-4 pt-3 pb-1">
            <span className="text-[11px] font-medium uppercase tracking-wider text-text-muted">
              {group.label}
            </span>
          </div>
          {group.tasks.map((task) => (
            <TaskItem key={task.id} task={task} onComplete={onComplete} onDelete={onDelete} onEdit={onEdit} />
          ))}
        </div>
      ))}
    </div>
  )
}
