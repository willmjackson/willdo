import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent
} from '@dnd-kit/core'
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy
} from '@dnd-kit/sortable'
import { restrictToVerticalAxis } from '@dnd-kit/modifiers'
import { TaskItem } from './TaskItem'
import type { Task } from '../../../shared/types'

interface TaskListProps {
  tasks: Task[]
  onComplete: (id: string) => Promise<Task>
  onDelete: (id: string) => Promise<void>
  onReorder: (id: string, newOrder: number) => Promise<void>
  view: 'inbox' | 'today'
}

export function TaskList({ tasks, onComplete, onDelete, onReorder, view }: TaskListProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 }
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates
    })
  )

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const activeIndex = tasks.findIndex(t => t.id === active.id)
    const overIndex = tasks.findIndex(t => t.id === over.id)

    // Calculate new sort_order using fractional indexing
    let newOrder: number
    if (overIndex === 0) {
      newOrder = tasks[0].sort_order - 1
    } else if (overIndex === tasks.length - 1) {
      newOrder = tasks[tasks.length - 1].sort_order + 1
    } else if (activeIndex < overIndex) {
      // Moving down
      newOrder = (tasks[overIndex].sort_order + tasks[overIndex + 1].sort_order) / 2
    } else {
      // Moving up
      newOrder = (tasks[overIndex - 1].sort_order + tasks[overIndex].sort_order) / 2
    }

    await onReorder(String(active.id), newOrder)
  }

  if (tasks.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-text-muted text-sm">
        {view === 'today' ? 'Nothing due today' : 'No tasks yet — add one above!'}
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        modifiers={[restrictToVerticalAxis]}
        onDragEnd={handleDragEnd}
      >
        <SortableContext items={tasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
          {tasks.map((task) => (
            <TaskItem
              key={task.id}
              task={task}
              onComplete={onComplete}
              onDelete={onDelete}
            />
          ))}
        </SortableContext>
      </DndContext>
    </div>
  )
}
