import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth'
import { loadOncall, saveOncall } from '@/lib/oncall-store'
import type { Shift } from '@/lib/oncall-store'
import crypto from 'crypto'

function validShift(value: unknown): value is Omit<Shift, 'id'> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false
  const shift = value as Record<string, unknown>
  const allowed = ['name', 'userEmail', 'userName', 'startTime', 'endTime', 'timezone']
  if (Object.keys(shift).some(key => !allowed.includes(key))) return false
  if (['name', 'userEmail', 'userName', 'startTime', 'endTime', 'timezone'].some(key => typeof shift[key] !== 'string' || !(shift[key] as string).trim())) return false
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(shift.userEmail as string)) return false
  const start = Date.parse(shift.startTime as string)
  const end = Date.parse(shift.endTime as string)
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return false
  try { new Intl.DateTimeFormat('en', { timeZone: shift.timezone as string }) }
  catch { return false }
  return true
}

export async function GET(req: NextRequest) {
  const auth = await requireRole(req, 'viewer')
  if (auth instanceof NextResponse) return auth
  return NextResponse.json(loadOncall().shifts)
}

export async function POST(req: NextRequest) {
  const auth = await requireRole(req, 'editor')
  if (auth instanceof NextResponse) return auth
  let body: unknown
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }
  if (!validShift(body)) return NextResponse.json({ error: 'Invalid on-call shift' }, { status: 400 })
  const store = loadOncall()
  const shift: Shift = { ...body, id: crypto.randomUUID() }
  store.shifts.push(shift)
  saveOncall(store)
  return NextResponse.json(shift, { status: 201 })
}
