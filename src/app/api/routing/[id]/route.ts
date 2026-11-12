import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth'
import { loadRouting, saveRouting, loadPolicies } from '@/lib/oncall-store'

function validRule(value: unknown): boolean {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false
  const rule = value as Record<string, unknown>
  const allowed = ['name', 'severity', 'category', 'notifyEmails', 'notifySlack', 'notifyOncall', 'escalationPolicyId']
  if (Object.keys(rule).some(key => !allowed.includes(key))) return false
  if (typeof rule.name !== 'string' || !rule.name.trim()) return false
  if (!['*', 'critical', 'high', 'medium', 'low'].includes(rule.severity as string)) return false
  if (!['*', 'build-failure', 'deploy-failure', 'test-failure', 'security', 'performance', 'other'].includes(rule.category as string)) return false
  if (!Array.isArray(rule.notifyEmails) || rule.notifyEmails.some(email => typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))) return false
  if (typeof rule.notifySlack !== 'boolean' || typeof rule.notifyOncall !== 'boolean' || typeof rule.escalationPolicyId !== 'string') return false
  return !rule.escalationPolicyId || loadPolicies().some(policy => policy.id === rule.escalationPolicyId)
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireRole(req, 'admin')
  if (auth instanceof NextResponse) return auth
  const { id } = await params
  let body: unknown
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }
  if (!body || typeof body !== 'object' || Array.isArray(body)) return NextResponse.json({ error: 'Invalid routing rule' }, { status: 400 })
  const allowed = ['name', 'severity', 'category', 'notifyEmails', 'notifySlack', 'notifyOncall', 'escalationPolicyId']
  if (Object.keys(body).some(key => !allowed.includes(key))) return NextResponse.json({ error: 'Invalid routing rule' }, { status: 400 })
  const rules = loadRouting()
  const idx = rules.findIndex(r => r.id === id)
  if (idx === -1) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const updated = { ...rules[idx], ...body }
  const fields = Object.fromEntries(Object.entries(updated).filter(([key]) => key !== 'id'))
  if (!validRule(fields)) return NextResponse.json({ error: 'Invalid routing rule' }, { status: 400 })
  rules[idx] = updated
  saveRouting(rules)
  return NextResponse.json(rules[idx])
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireRole(req, 'admin')
  if (auth instanceof NextResponse) return auth
  const { id } = await params
  if (id === 'default') return NextResponse.json({ error: 'Cannot delete default rule' }, { status: 400 })
  const rules = loadRouting()
  const filtered = rules.filter(r => r.id !== id)
  if (filtered.length === rules.length) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  saveRouting(filtered)
  return NextResponse.json({ ok: true })
}
