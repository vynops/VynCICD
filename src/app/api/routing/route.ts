import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth'
import { loadRouting, saveRouting, loadPolicies } from '@/lib/oncall-store'
import type { RoutingRule } from '@/lib/oncall-store'
import crypto from 'crypto'

export async function GET(req: NextRequest) {
  const auth = await requireRole(req, 'viewer')
  if (auth instanceof NextResponse) return auth
  return NextResponse.json(loadRouting())
}

export async function POST(req: NextRequest) {
  const auth = await requireRole(req, 'admin')
  if (auth instanceof NextResponse) return auth
  const body = await req.json() as Omit<RoutingRule, 'id'>
  const rules = loadRouting()
  const rule: RoutingRule = { ...body, id: crypto.randomUUID() }
  rules.push(rule)
  saveRouting(rules)
  return NextResponse.json(rule, { status: 201 })
}
