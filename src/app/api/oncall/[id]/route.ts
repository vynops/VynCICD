import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth'
import { loadOncall, saveOncall } from '@/lib/oncall-store'

function validShift(value: unknown): boolean {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false
  const shift = value as Record<string, unknown>
  const allowed = ['name', 'userEmail', 'userName', 'startTime', 'endTime', 'timezone']
  if (Object.keys(shift).some(key => !allowed.includes(key))) return false
  if (allowed.some(key => typeof shift[key] !== 'string' || !(shift[key] as string).trim())) return false
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(shift.userEmail as string)) return false
  const start = Date.parse(shift.startTime as string)
  const end = Date.parse(shift.endTime as string)
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return false
  try { new Intl.DateTimeFormat('en', { timeZone: shift.timezone as string }) }
  catch { return false }
  return true
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireRole(req, 'editor')
  if (auth instanceof NextResponse) return auth
  const { id } = await params
  let body: unknown
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }
  if (!body || typeof body !== 'object' || Array.isArray(body)) return NextResponse.json({ error: 'Invalid on-call shift' }, { status: 400 })
  const allowed = ['name', 'userEmail', 'userName', 'startTime', 'endTime', 'timezone']
  if (Object.keys(body).some(key => !allowed.includes(key))) return NextResponse.json({ error: 'Invalid on-call shift' }, { status: 400 })
  const store = loadOncall()
  const idx = store.shifts.findIndex(s => s.id === id)
  if (idx === -1) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const updated = { ...store.shifts[idx], ...body }
  const fields = Object.fromEntries(Object.entries(updated).filter(([key]) => key !== 'id'))
  if (!validShift(fields)) return NextResponse.json({ error: 'Invalid on-call shift' }, { status: 400 })
  store.shifts[idx] = updated
  saveOncall(store)
  return NextResponse.json(store.shifts[idx])
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireRole(req, 'editor')
  if (auth instanceof NextResponse) return auth
  const { id } = await params
  const store = loadOncall()
  const shifts = store.shifts.filter(s => s.id !== id)
  if (shifts.length === store.shifts.length) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  store.shifts = shifts
  saveOncall(store)
  return NextResponse.json({ ok: true })
}
