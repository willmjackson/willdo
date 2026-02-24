interface Env {
  DB: D1Database
  API_KEY: string
  CORS_ORIGIN: string // e.g. "https://willjackson.github.io"
}

interface TaskRow {
  id: string
  title: string
  due_date: string | null
  due_time: string | null
  rrule: string | null
  rrule_human: string | null
  is_recurring: number
  is_completed: number
  sort_order: number
  created_at: string
  updated_at: string
  source: string
  synced: number
}

function corsHeaders(origin: string): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-API-Key',
  }
}

function json(data: unknown, status = 200, origin = '*'): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
      ...corsHeaders(origin),
    },
  })
}

function error(message: string, status: number, origin = '*'): Response {
  return json({ error: message }, status, origin)
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url)
    const origin = env.CORS_ORIGIN || '*'

    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders(origin) })
    }

    // Authenticate
    const apiKey = request.headers.get('X-API-Key')
    if (apiKey !== env.API_KEY) {
      return error('Unauthorized', 401, origin)
    }

    const path = url.pathname

    try {
      // GET /tasks — list active tasks
      if (request.method === 'GET' && path === '/tasks') {
        const tasks = await env.DB.prepare(
          'SELECT * FROM tasks WHERE is_completed = 0 ORDER BY due_date IS NULL, due_date ASC, sort_order ASC'
        ).all<TaskRow>()
        return json(tasks.results, 200, origin)
      }

      // POST /tasks — create task from mobile, return all active tasks
      if (request.method === 'POST' && path === '/tasks') {
        const body = await request.json<{
          id: string
          title: string
          due_date?: string | null
          due_time?: string | null
          rrule?: string | null
          rrule_human?: string | null
          is_recurring?: boolean
          sort_order: number
        }>()

        const now = new Date().toISOString()
        await env.DB.prepare(
          `INSERT INTO tasks (id, title, due_date, due_time, rrule, rrule_human, is_recurring, sort_order, created_at, updated_at, source, synced)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'mobile', 0)`
        ).bind(
          body.id,
          body.title,
          body.due_date ?? null,
          body.due_time ?? null,
          body.rrule ?? null,
          body.rrule_human ?? null,
          body.is_recurring ? 1 : 0,
          body.sort_order,
          now,
          now,
        ).run()

        // Return all active tasks
        const tasks = await env.DB.prepare(
          'SELECT * FROM tasks WHERE is_completed = 0 ORDER BY due_date IS NULL, due_date ASC, sort_order ASC'
        ).all<TaskRow>()
        return json(tasks.results, 201, origin)
      }

      // PATCH /tasks/:id/complete — mark task completed from mobile
      const completeMatch = path.match(/^\/tasks\/([^/]+)\/complete$/)
      if (request.method === 'PATCH' && completeMatch) {
        const taskId = completeMatch[1]
        // Flip to mobile-sourced so desktop pull picks it up
        await env.DB.prepare(
          "UPDATE tasks SET is_completed = 1, source = 'mobile', synced = 0, updated_at = ? WHERE id = ?"
        ).bind(new Date().toISOString(), taskId).run()
        const tasks = await env.DB.prepare(
          'SELECT * FROM tasks WHERE is_completed = 0 ORDER BY due_date IS NULL, due_date ASC, sort_order ASC'
        ).all<TaskRow>()
        return json(tasks.results, 200, origin)
      }

      // PATCH /tasks/:id — update task fields from mobile
      const updateMatch = path.match(/^\/tasks\/([^/]+)$/)
      if (request.method === 'PATCH' && updateMatch) {
        const taskId = updateMatch[1]
        const body = await request.json<{
          title?: string
          due_date?: string | null
          due_time?: string | null
          rrule?: string | null
          rrule_human?: string | null
          is_recurring?: number
        }>()
        const sets: string[] = []
        const vals: unknown[] = []
        if (body.title !== undefined) { sets.push('title = ?'); vals.push(body.title) }
        if (body.due_date !== undefined) { sets.push('due_date = ?'); vals.push(body.due_date) }
        if (body.due_time !== undefined) { sets.push('due_time = ?'); vals.push(body.due_time) }
        if (body.rrule !== undefined) { sets.push('rrule = ?'); vals.push(body.rrule) }
        if (body.rrule_human !== undefined) { sets.push('rrule_human = ?'); vals.push(body.rrule_human) }
        if (body.is_recurring !== undefined) { sets.push('is_recurring = ?'); vals.push(body.is_recurring) }
        sets.push("source = 'mobile'", 'synced = 0', 'updated_at = ?')
        vals.push(new Date().toISOString(), taskId)
        await env.DB.prepare(`UPDATE tasks SET ${sets.join(', ')} WHERE id = ?`).bind(...vals).run()
        const tasks = await env.DB.prepare(
          'SELECT * FROM tasks WHERE is_completed = 0 ORDER BY due_date IS NULL, due_date ASC, sort_order ASC'
        ).all<TaskRow>()
        return json(tasks.results, 200, origin)
      }

      // DELETE /tasks/:id — delete task from mobile
      const deleteMatch = path.match(/^\/tasks\/([^/]+)$/)
      if (request.method === 'DELETE' && deleteMatch) {
        const taskId = deleteMatch[1]
        // Mark as deleted (is_completed=2) and flip to mobile-sourced for desktop sync
        await env.DB.prepare(
          "UPDATE tasks SET is_completed = 2, source = 'mobile', synced = 0, updated_at = ? WHERE id = ?"
        ).bind(new Date().toISOString(), taskId).run()
        const tasks = await env.DB.prepare(
          'SELECT * FROM tasks WHERE is_completed = 0 ORDER BY due_date IS NULL, due_date ASC, sort_order ASC'
        ).all<TaskRow>()
        return json(tasks.results, 200, origin)
      }

      // POST /sync/push — desktop pushes full task snapshot
      if (request.method === 'POST' && path === '/sync/push') {
        const body = await request.json<{ tasks: TaskRow[] }>()

        // Delete all desktop-sourced rows, keep unsynced mobile rows
        await env.DB.prepare("DELETE FROM tasks WHERE source = 'desktop'").run()

        // Also delete mobile rows that have been synced (acked by desktop)
        await env.DB.prepare("DELETE FROM tasks WHERE source = 'mobile' AND synced = 1").run()

        // Insert desktop tasks
        if (body.tasks.length > 0) {
          const stmt = env.DB.prepare(
            `INSERT OR REPLACE INTO tasks (id, title, due_date, due_time, rrule, rrule_human, is_recurring, is_completed, sort_order, created_at, updated_at, source, synced)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'desktop', 1)`
          )
          const batch = body.tasks.map(t =>
            stmt.bind(t.id, t.title, t.due_date, t.due_time ?? null, t.rrule, t.rrule_human, t.is_recurring, t.is_completed, t.sort_order, t.created_at, t.updated_at)
          )
          await env.DB.batch(batch)
        }

        return json({ ok: true, count: body.tasks.length }, 200, origin)
      }

      // GET /sync/pending — desktop polls for unsynced mobile tasks
      if (request.method === 'GET' && path === '/sync/pending') {
        const tasks = await env.DB.prepare(
          "SELECT * FROM tasks WHERE source = 'mobile' AND synced = 0"
        ).all<TaskRow>()
        return json(tasks.results, 200, origin)
      }

      // POST /sync/ack — desktop acknowledges imported mobile tasks
      if (request.method === 'POST' && path === '/sync/ack') {
        const body = await request.json<{ ids: string[] }>()
        if (body.ids.length > 0) {
          const placeholders = body.ids.map(() => '?').join(',')
          await env.DB.prepare(
            `UPDATE tasks SET synced = 1 WHERE id IN (${placeholders})`
          ).bind(...body.ids).run()
        }
        return json({ ok: true }, 200, origin)
      }

      return error('Not found', 404, origin)
    } catch (err) {
      console.error(err)
      return error('Internal server error', 500, origin)
    }
  },
}
