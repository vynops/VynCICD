import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth'
import { updateIncident, IncidentInputError, IncidentMissingError } from '@/lib/oncall-store'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireRole(req, 'editor')
  if (auth instanceof NextResponse) return auth
  const { id } = await params
  let body
  try { body = await req.json() }
  catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }
  try {
    const updated = updateIncident(id, body, auth.id)
    return NextResponse.json(updated)
  } catch (e) {
    const status = e instanceof IncidentMissingError ? 404 : e instanceof IncidentInputError ? 400 : 503
    return NextResponse.json({ error: status === 404 ? 'Incident not found' : status === 400 ? 'Invalid incident' : 'Incident storage unavailable' }, { status })
  }
}
