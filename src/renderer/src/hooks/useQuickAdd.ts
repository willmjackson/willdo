import { useState, useMemo } from 'react'
import { parseTaskInput } from '@willdo/shared'
import type { ParsedTask } from '@willdo/shared'

export function useQuickAdd() {
  const [input, setInput] = useState('')

  const parsed: ParsedTask = useMemo(() => {
    return parseTaskInput(input)
  }, [input])

  const hasContent = input.trim().length > 0
  const hasExtras = parsed.due_date !== null || parsed.due_time !== null || parsed.is_recurring

  const reset = () => setInput('')

  return { input, setInput, parsed, hasContent, hasExtras, reset }
}
