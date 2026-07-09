import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth'
import { findUserById, updateUser, deleteUser } from '@/lib/user-store'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireRole(req, 'admin')
  if (auth instanceof NextResponse) return auth
  const { id } = await params
  const body = await req.json() as { name?: string; role?: 'admin' | 'editor' | 'viewer'; password?: string }
  try {
    const user = updateUser(id, body)
    return NextResponse.json({ ...user, passwordHash: undefined, passwordSalt: undefined })
  } catch (e) { return NextResponse.json({ error: (e as Error).message }, { status: 404 }) }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireRole(req, 'admin')
  if (auth instanceof NextResponse) return auth
  const { id } = await params
  try { deleteUser(id); return NextResponse.json({ ok: true }) }
  catch (e) { return NextResponse.json({ error: (e as Error).message }, { status: 400 }) }
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireRole(req, 'viewer')
  if (auth instanceof NextResponse) return auth
  const { id } = await params
  const u = findUserById(id)
  if (!u) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json({ ...u, passwordHash: undefined, passwordSalt: undefined })
}
