import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth'
import { loadOncall, saveOncall } from '@/lib/oncall-store'
import type { Shift } from '@/lib/oncall-store'
import crypto from 'crypto'

export async function GET(req: NextRequest) {
  const auth = await requireRole(req, 'viewer')
  if (auth instanceof NextResponse) return auth
  return NextResponse.json(loadOncall().shifts)
}

export async function POST(req: NextRequest) {
  const auth = await requireRole(req, 'editor')
  if (auth instanceof NextResponse) return auth
  const body = await req.json() as Omit<Shift, 'id'>
  const store = loadOncall()
  const shift: Shift = { ...body, id: crypto.randomUUID() }
  store.shifts.push(shift)
  saveOncall(store)
  return NextResponse.json(shift, { status: 201 })
}
