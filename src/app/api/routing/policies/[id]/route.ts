import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth'
import { loadPolicies, loadRouting, savePolicies } from '@/lib/oncall-store'
import type { EscalationPolicy } from '@/lib/oncall-store'

function validPolicy(value: unknown): boolean {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false
  const policy = value as Record<string, unknown>
  if (Object.keys(policy).some(key => !['name', 'steps'].includes(key))) return false
  if (typeof policy.name !== 'string' || !policy.name.trim() || !Array.isArray(policy.steps)) return false
  return policy.steps.every((value: unknown) => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return false
    const step = value as Record<string, unknown>
    return Object.keys(step).every(key => ['delayMin', 'notifyEmails', 'notifySlack', 'notifyOncall'].includes(key))
      && Number.isInteger(step.delayMin) && (step.delayMin as number) > 0
      && Array.isArray(step.notifyEmails) && step.notifyEmails.every((email: unknown) => typeof email === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      && typeof step.notifySlack === 'boolean' && typeof step.notifyOncall === 'boolean'
  })
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireRole(req, 'admin')
  if (auth instanceof NextResponse) return auth
  const { id } = await params
  let body: unknown
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }
  if (!body || typeof body !== 'object' || Array.isArray(body)) return NextResponse.json({ error: 'Invalid escalation policy' }, { status: 400 })
  if (Object.keys(body).some(key => !['name', 'steps'].includes(key))) return NextResponse.json({ error: 'Invalid escalation policy' }, { status: 400 })
  const policies = loadPolicies()
  const idx = policies.findIndex(p => p.id === id)
  if (idx === -1) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const updated = { ...policies[idx], ...body, id }
  const fields = Object.fromEntries(Object.entries(updated).filter(([key]) => key !== 'id'))
  if (!validPolicy(fields)) return NextResponse.json({ error: 'Invalid escalation policy' }, { status: 400 })
  policies[idx] = updated
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
  if (loadRouting().some(rule => rule.escalationPolicyId === id)) return NextResponse.json({ error: 'Remove this policy from its routing rules before deleting it' }, { status: 409 })
  savePolicies(filtered)
  return NextResponse.json({ ok: true })
}
