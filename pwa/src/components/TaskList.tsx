import { isOverdue, isToday } from '@willdo/shared'
import type { SyncTask } from '../lib/api'
import { TaskItem } from './TaskItem'

interface TaskListProps {
  tasks: SyncTask[]
}

interface TaskGroup {
  label: string
  tasks: SyncTask[]
}

function groupTasks(tasks: SyncTask[]): TaskGroup[] {
  const today = todayISO()
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
  if (overdue.length) groups.push({ label: 'Overdue', tasks: overdue })
  if (todayTasks.length) groups.push({ label: 'Today', tasks: todayTasks })
  if (upcoming.length) groups.push({ label: 'Upcoming', tasks: upcoming })
  if (noDate.length) groups.push({ label: 'No date', tasks: noDate })
  return groups
}

export function TaskList({ tasks }: TaskListProps) {
  if (tasks.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-text-muted text-sm p-8">
        No tasks yet
      </div>
    )
  }

  const groups = groupTasks(tasks)

  return (
    <div className="flex-1 overflow-y-auto">
      {groups.map((group) => (
        <div key={group.label}>
          <div className="px-4 pt-3 pb-1">
            <span className="text-[11px] font-medium uppercase tracking-wider text-text-muted">
              {group.label}
            </span>
          </div>
          {group.tasks.map((task) => (
            <TaskItem key={task.id} task={task} />
          ))}
        </div>
      ))}
    </div>
  )
}
