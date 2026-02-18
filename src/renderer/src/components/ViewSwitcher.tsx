interface ViewSwitcherProps {
  view: 'inbox' | 'today'
  onViewChange: (view: 'inbox' | 'today') => void
  todayCount: number
}

export function ViewSwitcher({ view, onViewChange, todayCount }: ViewSwitcherProps) {
  return (
    <div className="flex gap-1 bg-bg-hover rounded-lg p-1">
      <button
        onClick={() => onViewChange('inbox')}
        className={`flex-1 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
          view === 'inbox'
            ? 'bg-white text-text shadow-sm'
            : 'text-text-secondary hover:text-text'
        }`}
      >
        Inbox
      </button>
      <button
        onClick={() => onViewChange('today')}
        className={`flex-1 px-3 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center justify-center gap-1.5 ${
          view === 'today'
            ? 'bg-white text-text shadow-sm'
            : 'text-text-secondary hover:text-text'
        }`}
      >
        Today
        {todayCount > 0 && (
          <span className={`text-xs rounded-full px-1.5 py-0.5 min-w-[20px] text-center ${
            view === 'today'
              ? 'bg-accent text-white'
              : 'bg-border text-text-secondary'
          }`}>
            {todayCount}
          </span>
        )}
      </button>
    </div>
  )
}
