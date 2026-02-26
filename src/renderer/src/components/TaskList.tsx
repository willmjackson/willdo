import React, { useState } from 'react'
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
import { ReviewTaskItem } from './ReviewTaskItem'
import type { Task } from '@willdo/shared'

interface TaskListProps {
  tasks: Task[]
  onComplete: (id: string) => Promise<Task>
  onDelete: (id: string) => Promise<void>
  onEdit: (task: Task) => void
  onLaunchClaude: (task: Task) => void
  onReorder: (id: string, newOrder: number) => Promise<void>
  onAcceptReview: (id: string) => Promise<Task>
  onDismissReview: (id: string, comment?: string) => Promise<void>
  view: 'inbox' | 'today'
}

export function TaskList({ tasks, onComplete, onDelete, onEdit, onLaunchClaude, onReorder, onAcceptReview, onDismissReview, view }: TaskListProps) {
  const [reviewCollapsed, setReviewCollapsed] = useState(false)

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 }
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates
    })
  )

  const reviewTasks = tasks.filter(t => t.status === 'review')
  const activeTasks = tasks.filter(t => t.status !== 'review')

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const activeIndex = activeTasks.findIndex(t => t.id === active.id)
    const overIndex = activeTasks.findIndex(t => t.id === over.id)

    // Calculate new sort_order using fractional indexing
    let newOrder: number
    if (overIndex === 0) {
      newOrder = activeTasks[0].sort_order - 1
    } else if (overIndex === activeTasks.length - 1) {
      newOrder = activeTasks[activeTasks.length - 1].sort_order + 1
    } else if (activeIndex < overIndex) {
      // Moving down
      newOrder = (activeTasks[overIndex].sort_order + activeTasks[overIndex + 1].sort_order) / 2
    } else {
      // Moving up
      newOrder = (activeTasks[overIndex - 1].sort_order + activeTasks[overIndex].sort_order) / 2
    }

    await onReorder(String(active.id), newOrder)
  }

  if (tasks.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-text-muted gap-1">
        <span className="text-2xl">{view === 'today' ? '\u2600\ufe0f' : '\u270f\ufe0f'}</span>
        <span className="text-sm">
          {view === 'today' ? 'Nothing due today' : 'No tasks yet'}
        </span>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto">
      {/* Review section */}
      {reviewTasks.length > 0 && (
        <div className="border-b border-review-border/30">
          {/* Section header */}
          <button
            onClick={() => setReviewCollapsed(c => !c)}
            className="w-full flex items-center gap-2 px-4 py-2 text-xs font-medium uppercase tracking-wide text-review-text hover:bg-review/50 transition-colors"
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

          {/* Review items */}
          {!reviewCollapsed && (
            <div className="pb-1">
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

      {/* Active tasks with drag-to-reorder */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        modifiers={[restrictToVerticalAxis]}
        onDragEnd={handleDragEnd}
      >
        <SortableContext items={activeTasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
          {activeTasks.map((task) => (
            <TaskItem
              key={task.id}
              task={task}
              onComplete={onComplete}
              onDelete={onDelete}
              onEdit={onEdit}
              onLaunchClaude={onLaunchClaude}
            />
          ))}
        </SortableContext>
      </DndContext>
    </div>
  )
}
