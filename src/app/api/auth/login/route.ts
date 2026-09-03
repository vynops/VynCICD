import { NextRequest, NextResponse } from 'next/server'
import { findUserByEmail } from '@/lib/user-store'
import { verifyPassword } from '@/lib/user-store'
import { createSession, sessionCookieName } from '@/lib/auth'
import { seedDefaultAdmin } from '@/lib/user-store'
import { seedIfEmpty } from '@/lib/seed'

export async function POST(req: NextRequest) {
  seedDefaultAdmin()
  seedIfEmpty()
  const { email, password } = await req.json() as { email?: string; password?: string }
  if (!email || !password) return NextResponse.json({ error: 'Email and password required.' }, { status: 400 })
  const user = findUserByEmail(email)
  if (!user || !verifyPassword(password, user.passwordHash, user.passwordSalt)) {
    return NextResponse.json({ error: 'Invalid credentials.' }, { status: 401 })
  }
  if (!user.active) return NextResponse.json({ error: 'This account has been deactivated.' }, { status: 403 })
  const token = await createSession({ id: user.id, email: user.email, name: user.name, role: user.role })
  const res = NextResponse.json({ ok: true })
  res.cookies.set(sessionCookieName(), token, { httpOnly: true, sameSite: 'lax', path: '/', maxAge: 7 * 86400 })
  return res
}
