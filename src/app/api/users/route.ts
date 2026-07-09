import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth'
import { listUsers, createUser } from '@/lib/user-store'
import type { UserRole } from '@/lib/user-store'

export async function GET(req: NextRequest) {
  const auth = await requireRole(req, 'viewer')
  if (auth instanceof NextResponse) return auth
  return NextResponse.json(listUsers().map(u => ({ ...u, passwordHash: undefined, passwordSalt: undefined })))
}

export async function POST(req: NextRequest) {
  const auth = await requireRole(req, 'admin')
  if (auth instanceof NextResponse) return auth
  const { email, name, role, password } = await req.json() as { email?: string; name?: string; role?: UserRole; password?: string }
  if (!email || !name || !role || !password) return NextResponse.json({ error: 'All fields required.' }, { status: 400 })
  try {
    const user = createUser({ email, name, role, password })
    return NextResponse.json({ ...user, passwordHash: undefined, passwordSalt: undefined }, { status: 201 })
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 })
  }
}
