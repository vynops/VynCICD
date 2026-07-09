import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth'
import { loadEnvironments, saveEnvironments } from '@/lib/data-store'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireRole(req, 'admin')
  if (auth instanceof NextResponse) return auth
  const { id } = await params
  const body = await req.json()
  const envs = loadEnvironments()
  const idx = envs.findIndex(e => e.id === id)
  if (idx === -1) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  envs[idx] = { ...envs[idx], ...body }
  saveEnvironments(envs)
  return NextResponse.json(envs[idx])
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireRole(req, 'admin')
  if (auth instanceof NextResponse) return auth
  const { id } = await params
  const envs = loadEnvironments()
  saveEnvironments(envs.filter(e => e.id !== id))
  return NextResponse.json({ ok: true })
}
