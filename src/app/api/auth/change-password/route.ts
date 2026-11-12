import { NextRequest, NextResponse } from 'next/server'
import { createSession, getSessionFromRequest, sessionCookieName } from '@/lib/auth'
import { changeInitialPassword } from '@/lib/user-store'

export async function POST(req: NextRequest) {
  const session = await getSessionFromRequest(req)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!session.mustChangePassword) {
    return NextResponse.json({ error: 'An initial password change is not required.' }, { status: 409 })
  }
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 })
  }
  if (!body || typeof body !== 'object' || Array.isArray(body)
    || !('currentPassword' in body) || typeof body.currentPassword !== 'string'
    || !('newPassword' in body) || typeof body.newPassword !== 'string'
    || !('confirmPassword' in body) || body.confirmPassword !== body.newPassword
  ) {
    return NextResponse.json({ error: 'Provide your current password and matching new passwords.' }, { status: 400 })
  }
  try {
    const result = changeInitialPassword(session.id, body.currentPassword, body.newPassword, session.sessionVersion)
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 })
    const user = result.user
    const token = await createSession({
      id: user.id, email: user.email, name: user.name, role: user.role,
      mustChangePassword: user.mustChangePassword, sessionVersion: user.sessionVersion,
    })
    const response = NextResponse.json({ ok: true })
    response.cookies.set(sessionCookieName(), token, {
      httpOnly: true, sameSite: 'lax', path: '/', maxAge: 7 * 86400,
    })
    return response
  } catch {
    console.error('[auth] Initial password change failed')
    return NextResponse.json({ error: 'Unable to change your password. Please try again.' }, { status: 500 })
  }
}
