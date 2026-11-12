import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth'
import { loadRouting, saveRouting, loadPolicies } from '@/lib/oncall-store'
import type { RoutingRule } from '@/lib/oncall-store'
import crypto from 'crypto'

function validRule(value: unknown): value is Omit<RoutingRule, 'id'> {
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

export async function GET(req: NextRequest) {
  const auth = await requireRole(req, 'viewer')
  if (auth instanceof NextResponse) return auth
  return NextResponse.json(loadRouting())
}

export async function POST(req: NextRequest) {
  const auth = await requireRole(req, 'admin')
  if (auth instanceof NextResponse) return auth
  let body: unknown
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }
  if (!validRule(body)) return NextResponse.json({ error: 'Invalid routing rule' }, { status: 400 })
  const rules = loadRouting()
  const rule: RoutingRule = { ...body, id: crypto.randomUUID() }
  rules.push(rule)
  saveRouting(rules)
  return NextResponse.json(rule, { status: 201 })
}
