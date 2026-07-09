import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth'
import { loadOncall, saveOncall } from '@/lib/oncall-store'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireRole(req, 'editor')
  if (auth instanceof NextResponse) return auth
  const { id } = await params
  const body = await req.json()
  const store = loadOncall()
  const idx = store.shifts.findIndex(s => s.id === id)
  if (idx === -1) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  store.shifts[idx] = { ...store.shifts[idx], ...body }
  saveOncall(store)
  return NextResponse.json(store.shifts[idx])
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireRole(req, 'editor')
  if (auth instanceof NextResponse) return auth
  const { id } = await params
  const store = loadOncall()
  store.shifts = store.shifts.filter(s => s.id !== id)
  saveOncall(store)
  return NextResponse.json({ ok: true })
}
