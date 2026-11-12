import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth'
import { loadPolicies, savePolicies } from '@/lib/oncall-store'
import type { EscalationPolicy } from '@/lib/oncall-store'
import crypto from 'crypto'

function validPolicy(value: unknown): value is Pick<EscalationPolicy, 'name' | 'steps'> {
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

export async function GET(req: NextRequest) {
  const auth = await requireRole(req, 'viewer')
  if (auth instanceof NextResponse) return auth
  return NextResponse.json(loadPolicies())
}

export async function POST(req: NextRequest) {
  const auth = await requireRole(req, 'admin')
  if (auth instanceof NextResponse) return auth
  let body: unknown
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }
  if (!validPolicy(body)) return NextResponse.json({ error: 'Invalid escalation policy' }, { status: 400 })
  const policy: EscalationPolicy = {
    id: `policy-${crypto.randomUUID().slice(0, 8)}`,
    name: body.name.trim(),
    steps: body.steps,
  }
  const policies = loadPolicies()
  policies.push(policy)
  savePolicies(policies)
  return NextResponse.json(policy, { status: 201 })
}
