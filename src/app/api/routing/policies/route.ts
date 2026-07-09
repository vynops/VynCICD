import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth'
import { loadPolicies, savePolicies } from '@/lib/oncall-store'
import type { EscalationPolicy } from '@/lib/oncall-store'
import crypto from 'crypto'

export async function GET(req: NextRequest) {
  const auth = await requireRole(req, 'viewer')
  if (auth instanceof NextResponse) return auth
  return NextResponse.json(loadPolicies())
}

export async function POST(req: NextRequest) {
  const auth = await requireRole(req, 'admin')
  if (auth instanceof NextResponse) return auth
  const body = await req.json() as Partial<EscalationPolicy>
  if (!body.name?.trim()) return NextResponse.json({ error: 'name is required' }, { status: 400 })
  const policy: EscalationPolicy = {
    id: `policy-${crypto.randomUUID().slice(0, 8)}`,
    name: body.name.trim(),
    steps: body.steps ?? [],
  }
  const policies = loadPolicies()
  policies.push(policy)
  savePolicies(policies)
  return NextResponse.json(policy, { status: 201 })
}
