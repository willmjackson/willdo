import { useState } from 'react'
import type { ImportProgress } from '../../../shared/types'

interface ImportDialogProps {
  open: boolean
  onClose: () => void
  onDone: () => void
}

export function ImportDialog({ open, onClose, onDone }: ImportDialogProps) {
  const [token, setToken] = useState('')
  const [importing, setImporting] = useState(false)
  const [progress, setProgress] = useState<ImportProgress | null>(null)
  const [error, setError] = useState<string | null>(null)

  if (!open) return null

  const handleImport = async () => {
    if (!token.trim()) return
    setImporting(true)
    setError(null)
    try {
      const result = await window.api.importFromTodoist(token.trim())
      setProgress(result)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e))
    }
    setImporting(false)
  }

  const handleDone = () => {
    setToken('')
    setProgress(null)
    setError(null)
    onDone()
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl w-[400px] p-6">
        <h2 className="text-lg font-semibold mb-1">Import from Todoist</h2>
        <p className="text-sm text-text-secondary mb-4">
          Get your API token from{' '}
          <span className="text-accent">Settings &rarr; Integrations &rarr; Developer</span>
        </p>

        {!progress ? (
          <>
            <input
              type="password"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="Paste your Todoist API token"
              className="w-full px-3 py-2 border border-border rounded-lg text-sm mb-3
                         focus:outline-none focus:border-border-focus focus:ring-1 focus:ring-border-focus"
              onKeyDown={(e) => e.key === 'Enter' && handleImport()}
            />
            {error && (
              <p className="text-sm text-danger mb-3">{error}</p>
            )}
            <div className="flex gap-2 justify-end">
              <button
                onClick={onClose}
                className="px-3 py-1.5 text-sm text-text-secondary hover:text-text rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleImport}
                disabled={importing || !token.trim()}
                className="px-4 py-1.5 text-sm bg-accent text-white rounded-lg hover:bg-accent-hover
                           disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {importing ? 'Importing...' : 'Import'}
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="space-y-2 mb-4">
              <div className="flex justify-between text-sm">
                <span>Total tasks:</span>
                <span className="font-medium">{progress.total}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Imported:</span>
                <span className="font-medium text-success">{progress.imported}</span>
              </div>
              {progress.skipped > 0 && (
                <div className="flex justify-between text-sm">
                  <span>Skipped (duplicates):</span>
                  <span className="font-medium text-text-secondary">{progress.skipped}</span>
                </div>
              )}
              {progress.failed.length > 0 && (
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>Issues:</span>
                    <span className="font-medium text-warning">{progress.failed.length}</span>
                  </div>
                  <div className="max-h-32 overflow-y-auto text-xs text-text-secondary bg-bg-hover rounded p-2 space-y-1">
                    {progress.failed.map((msg, i) => (
                      <div key={i}>{msg}</div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div className="flex justify-end">
              <button
                onClick={handleDone}
                className="px-4 py-1.5 text-sm bg-accent text-white rounded-lg hover:bg-accent-hover transition-colors"
              >
                Done
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
