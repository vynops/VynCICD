import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth'
import { loadIncidents, createIncident } from '@/lib/oncall-store'
import type { Incident } from '@/lib/oncall-store'

export async function GET(req: NextRequest) {
  const auth = await requireRole(req, 'viewer')
  if (auth instanceof NextResponse) return auth
  return NextResponse.json(loadIncidents())
}

export async function POST(req: NextRequest) {
  const auth = await requireRole(req, 'editor')
  if (auth instanceof NextResponse) return auth
  const body = await req.json() as Omit<Incident, 'id' | 'createdAt' | 'updatedAt'>
  if (!body.title || !body.severity || !body.status) return NextResponse.json({ error: 'title, severity, status required' }, { status: 400 })
  const inc = createIncident(body)
  return NextResponse.json(inc, { status: 201 })
}
