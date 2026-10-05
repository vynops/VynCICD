import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth'
import { loadIncidents, createIncident, IncidentInputError } from '@/lib/oncall-store'
import type { IncidentInput } from '@/lib/oncall-store'
import { getSettings } from '@/lib/settings-store'
import { notifyIncidentOpened } from '@/lib/notifier'

function recipientsFromSettings(): string[] {
  const s = getSettings()
  return (s.alertRecipients ?? '')
    .split(',')
    .map(v => v.trim())
    .filter(Boolean)
}

export async function GET(req: NextRequest) {
  const auth = await requireRole(req, 'viewer')
  if (auth instanceof NextResponse) return auth
  try { return NextResponse.json(loadIncidents()) }
  catch { return NextResponse.json({ error: 'Incident storage unavailable' }, { status: 503 }) }
}

export async function POST(req: NextRequest) {
  const auth = await requireRole(req, 'editor')
  if (auth instanceof NextResponse) return auth
  let body: IncidentInput
  try { body = await req.json() as IncidentInput }
  catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }
  if (!body || typeof body !== 'object' || Array.isArray(body)) return NextResponse.json({ error: 'Invalid incident' }, { status: 400 })
  if ('_demo' in body) return NextResponse.json({ error: 'Demo metadata is not writable through this API' }, { status: 400 })
  if (!body.title || !body.severity || !body.status) return NextResponse.json({ error: 'title, severity, status required' }, { status: 400 })
  let inc
  try { inc = createIncident(body, auth.id) }
  catch (error) {
    return NextResponse.json({ error: error instanceof IncidentInputError ? 'Invalid incident' : 'Incident storage unavailable' }, { status: error instanceof IncidentInputError ? 400 : 503 })
  }
  if (inc.status === 'open') {
    await notifyIncidentOpened({
      incidentId: inc.id,
      title: inc.title,
      severity: inc.severity,
      category: inc.category,
      source: inc.source,
      runId: inc.runId,
      repo: inc.repo,
      branch: inc.branch,
      commit: inc.commit,
      emails: recipientsFromSettings(),
    }).catch(() => {})
  }
  return NextResponse.json(inc, { status: 201 })
}
