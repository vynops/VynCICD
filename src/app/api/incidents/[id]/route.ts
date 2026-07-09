import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth'
import { updateIncident } from '@/lib/oncall-store'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireRole(req, 'editor')
  if (auth instanceof NextResponse) return auth
  const { id } = await params
  const body = await req.json()
  try {
    const updated = updateIncident(id, body)
    return NextResponse.json(updated)
  } catch (e) { return NextResponse.json({ error: (e as Error).message }, { status: 404 }) }
}
