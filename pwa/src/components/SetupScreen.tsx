import { useState } from 'react'
import { saveConfig } from '../lib/api'

interface SetupScreenProps {
  onComplete: () => void
}

export function SetupScreen({ onComplete }: SetupScreenProps) {
  const [url, setUrl] = useState('')
  const [key, setKey] = useState('')
  const [testing, setTesting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleConnect = async () => {
    if (!url.trim() || !key.trim()) return

    setTesting(true)
    setError(null)

    try {
      const cleanUrl = url.trim().replace(/\/$/, '')
      const res = await fetch(`${cleanUrl}/tasks`, {
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': key.trim(),
        },
      })

      if (!res.ok) {
        throw new Error(res.status === 401 ? 'Invalid API key' : `Server error (${res.status})`)
      }

      saveConfig(cleanUrl, key.trim())
      onComplete()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Connection failed')
    } finally {
      setTesting(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-text mb-1">WillDo</h1>
          <p className="text-sm text-text-secondary">Connect to your sync server</p>
        </div>

        <div className="flex flex-col gap-3">
          <input
            type="url"
            value={url}
            onChange={e => setUrl(e.target.value)}
            placeholder="Worker URL"
            autoCapitalize="none"
            autoCorrect="off"
            className="w-full px-3 py-2.5 text-base bg-bg-input border border-border rounded-lg
                       placeholder:text-text-muted
                       focus:outline-none focus:border-border-focus focus:ring-1 focus:ring-border-focus
                       transition-colors"
          />
          <input
            type="password"
            value={key}
            onChange={e => setKey(e.target.value)}
            placeholder="API Key"
            className="w-full px-3 py-2.5 text-base bg-bg-input border border-border rounded-lg
                       placeholder:text-text-muted
                       focus:outline-none focus:border-border-focus focus:ring-1 focus:ring-border-focus
                       transition-colors"
          />

          {error && (
            <p className="text-sm text-danger px-1">{error}</p>
          )}

          <button
            onClick={handleConnect}
            disabled={testing || !url.trim() || !key.trim()}
            className="w-full py-2.5 rounded-lg text-base font-semibold
                       bg-accent text-text-inverse
                       hover:bg-accent-hover active:bg-accent-hover
                       disabled:opacity-50 transition-colors"
          >
            {testing ? 'Connecting...' : 'Connect'}
          </button>
        </div>
      </div>
    </div>
  )
}
