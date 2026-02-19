import React, { useState, useEffect } from 'react'

const TERMINAL_OPTIONS = [
  {
    label: 'Terminal',
    description: 'Built-in macOS terminal',
    value: '/System/Applications/Utilities/Terminal.app'
  },
  {
    label: 'Ghostty',
    description: 'Fast, native terminal emulator',
    value: '/Applications/Ghostty.app'
  },
  {
    label: 'Warp',
    description: 'AI-powered terminal',
    value: '/Applications/Warp.app'
  }
]

interface SettingsModalProps {
  onClose: () => void
}

export function SettingsModal({ onClose }: SettingsModalProps) {
  const [terminalApp, setTerminalApp] = useState(TERMINAL_OPTIONS[0].value)
  const [syncUrl, setSyncUrl] = useState('')
  const [syncKey, setSyncKey] = useState('')
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    Promise.all([
      window.api.getSetting('terminal_app'),
      window.api.getSetting('sync_api_url'),
      window.api.getSetting('sync_api_key'),
    ]).then(([terminal, url, key]) => {
      if (terminal) setTerminalApp(terminal)
      if (url) setSyncUrl(url)
      if (key) setSyncKey(key)
      setLoaded(true)
    })
  }, [])

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [onClose])

  const handleSelect = (value: string) => {
    setTerminalApp(value)
    window.api.setSetting('terminal_app', value)
  }

  if (!loaded) return null

  return (
    <div className="fixed inset-0 z-40 bg-overlay flex items-start justify-center pt-16" onClick={onClose}>
      <div
        className="bg-bg-elevated rounded-xl shadow-lg w-[360px] max-h-[80vh] overflow-y-auto animate-in"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 pt-4 pb-2">
          <span className="text-xs text-text-muted font-medium uppercase tracking-wide">Settings</span>
          <button onClick={onClose} className="text-text-muted hover:text-text transition-colors">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <path d="M3.72 3.72a.75.75 0 0 1 1.06 0L8 6.94l3.22-3.22a.75.75 0 1 1 1.06 1.06L9.06 8l3.22 3.22a.75.75 0 1 1-1.06 1.06L8 9.06l-3.22 3.22a.75.75 0 0 1-1.06-1.06L6.94 8 3.72 4.78a.75.75 0 0 1 0-1.06z" />
            </svg>
          </button>
        </div>

        {/* Terminal selection */}
        <div className="px-4 py-3">
          <div className="text-xs text-text-muted font-medium uppercase tracking-wide mb-2">Terminal App</div>
          <div className="text-xs text-text-secondary mb-3">
            Used when launching Claude Code from a task
          </div>
          <div className="flex flex-col gap-1.5">
            {TERMINAL_OPTIONS.map((opt) => {
              const selected = terminalApp === opt.value
              return (
                <button
                  key={opt.value}
                  onClick={() => handleSelect(opt.value)}
                  className={`w-full text-left px-3 py-2.5 rounded-lg border transition-colors flex items-center gap-3
                    ${selected
                      ? 'border-accent bg-accent-subtle'
                      : 'border-border hover:border-border-focus hover:bg-bg-hover'
                    }`}
                >
                  <div className={`w-4 h-4 rounded-full border-2 shrink-0 flex items-center justify-center
                    ${selected ? 'border-accent' : 'border-text-muted'}`}>
                    {selected && <div className="w-2 h-2 rounded-full bg-accent" />}
                  </div>
                  <div>
                    <div className={`text-sm ${selected ? 'font-medium text-text' : 'text-text'}`}>
                      {opt.label}
                    </div>
                    <div className="text-xs text-text-muted">{opt.description}</div>
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        {/* Cloud Sync */}
        <div className="px-4 py-3 border-t border-border-subtle">
          <div className="text-xs text-text-muted font-medium uppercase tracking-wide mb-2">Cloud Sync</div>
          <div className="text-xs text-text-secondary mb-3">
            Connect to a Cloudflare Worker for mobile sync
          </div>
          <div className="flex flex-col gap-2">
            <input
              type="url"
              value={syncUrl}
              onChange={(e) => {
                setSyncUrl(e.target.value)
                window.api.setSetting('sync_api_url', e.target.value)
              }}
              placeholder="Worker URL (e.g. https://willdo-sync.you.workers.dev)"
              className="w-full px-2.5 py-2 bg-bg-input border border-border rounded-lg text-xs
                         placeholder:text-text-muted
                         focus:outline-none focus:border-border-focus focus:ring-1 focus:ring-border-focus
                         transition-colors"
            />
            <input
              type="password"
              value={syncKey}
              onChange={(e) => {
                setSyncKey(e.target.value)
                window.api.setSetting('sync_api_key', e.target.value)
              }}
              placeholder="API Key"
              className="w-full px-2.5 py-2 bg-bg-input border border-border rounded-lg text-xs
                         placeholder:text-text-muted
                         focus:outline-none focus:border-border-focus focus:ring-1 focus:ring-border-focus
                         transition-colors"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-border-subtle px-4 py-3 flex justify-end">
          <button
            onClick={onClose}
            className="text-xs px-3 py-1.5 rounded-md bg-accent text-text-inverse
                       hover:bg-accent-hover transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  )
}
