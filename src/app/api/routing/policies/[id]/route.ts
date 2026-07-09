import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth'
import { loadPolicies, savePolicies } from '@/lib/oncall-store'
import type { EscalationPolicy } from '@/lib/oncall-store'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireRole(req, 'admin')
  if (auth instanceof NextResponse) return auth
  const { id } = await params
  const body = await req.json() as Partial<EscalationPolicy>
  const policies = loadPolicies()
  const idx = policies.findIndex(p => p.id === id)
  if (idx === -1) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  policies[idx] = { ...policies[idx], ...body, id }
  savePolicies(policies)
  return NextResponse.json(policies[idx])
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireRole(req, 'admin')
  if (auth instanceof NextResponse) return auth
  const { id } = await params
  if (id === 'default') return NextResponse.json({ error: 'Cannot delete default policy' }, { status: 400 })
  const policies = loadPolicies()
  const filtered = policies.filter(p => p.id !== id)
  if (filtered.length === policies.length) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  savePolicies(filtered)
  return NextResponse.json({ ok: true })
}
