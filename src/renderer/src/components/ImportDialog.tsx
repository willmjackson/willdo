import React, { useState } from 'react'
import type { ImportProgress } from '../../../shared/types'

interface ImportDialogProps {
  open: boolean
  onClose: () => void
  onDone: () => void
}

export function ImportDialog({ open, onClose, onDone }: ImportDialogProps) {
  const [importing, setImporting] = useState(false)
  const [progress, setProgress] = useState<ImportProgress | null>(null)
  const [error, setError] = useState<string | null>(null)

  if (!open) return null

  const handleImport = async () => {
    setImporting(true)
    setError(null)
    try {
      const result = await window.api.importCSV()
      if (result.total === 0 && result.imported === 0) {
        // User cancelled file picker
        setImporting(false)
        return
      }
      setProgress(result)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e))
    }
    setImporting(false)
  }

  const handleDone = () => {
    setProgress(null)
    setError(null)
    onDone()
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-[var(--color-overlay)] flex items-center justify-center z-50">
      <div className="bg-bg-elevated rounded-xl shadow-[var(--shadow-lg)] w-[380px] p-6 animate-in">
        <h2 className="text-lg font-semibold mb-1">Import from Todoist</h2>
        <p className="text-sm text-text-secondary mb-4">
          Export your Todoist project as CSV, then select the file.
        </p>

        {!progress ? (
          <>
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
                disabled={importing}
                className="px-4 py-1.5 text-sm bg-accent text-text-inverse rounded-lg hover:bg-accent-hover
                           disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
              >
                {importing ? 'Importing...' : 'Choose CSV File...'}
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
                  <div className="max-h-32 overflow-y-auto text-xs text-text-secondary bg-bg-sunken rounded-lg p-2 space-y-1">
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
                className="px-4 py-1.5 text-sm bg-accent text-text-inverse rounded-lg hover:bg-accent-hover transition-colors font-medium"
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
