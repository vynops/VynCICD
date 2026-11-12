import { SignJWT, jwtVerify } from 'jose'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { findUserById } from '@/lib/user-store'

export interface SessionPayload {
  id: string
  email: string
  name: string
  role: 'admin' | 'editor' | 'viewer'
  mustChangePassword: boolean
  sessionVersion: number
  iat?: number
  exp?: number
}

const ROLE_ORDER: Record<string, number> = { viewer: 0, editor: 1, admin: 2 }

function getSecret(): Uint8Array {
  return new TextEncoder().encode(
    process.env.VYNCICD_SECRET ?? 'vyncicd-dev-fallback-change-in-production'
  )
}

export function sessionCookieName(): string { return 'vyncicd_session' }

export async function createSession(
  payload: Pick<SessionPayload, 'id' | 'email' | 'name' | 'role' | 'mustChangePassword' | 'sessionVersion'>
): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(getSecret())
}

export async function verifySession(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret())
    if (
      typeof payload.id !== 'string' || typeof payload.email !== 'string' || typeof payload.name !== 'string'
      || (payload.role !== 'admin' && payload.role !== 'editor' && payload.role !== 'viewer')
      || typeof payload.mustChangePassword !== 'boolean'
      || typeof payload.sessionVersion !== 'number' || !Number.isSafeInteger(payload.sessionVersion)
      || payload.sessionVersion < 0
    ) return null
    return {
      id: payload.id, email: payload.email, name: payload.name, role: payload.role,
      mustChangePassword: payload.mustChangePassword, sessionVersion: payload.sessionVersion,
      iat: payload.iat, exp: payload.exp,
    }
  } catch {
    return null
  }
}

export async function getSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies()
  return resolveSession(cookieStore.get(sessionCookieName())?.value)
}

async function resolveSession(token: string | undefined): Promise<SessionPayload | null> {
  if (!token) return null
  const session = await verifySession(token)
  const user = session ? findUserById(session.id) : null
  if (!session || !user?.active || session.sessionVersion !== user.sessionVersion) return null
  return {
    ...session, email: user.email, name: user.name, role: user.role,
    mustChangePassword: user.mustChangePassword,
  }
}

export async function getSessionFromRequest(req: NextRequest): Promise<SessionPayload | null> {
  return resolveSession(req.cookies.get(sessionCookieName())?.value)
}

export function hasRole(session: SessionPayload, minimum: 'viewer' | 'editor' | 'admin'): boolean {
  return (ROLE_ORDER[session.role] ?? -1) >= (ROLE_ORDER[minimum] ?? 99)
}

export async function requireRole(
  req: NextRequest,
  minimum: 'viewer' | 'editor' | 'admin'
): Promise<SessionPayload | NextResponse> {
  const session = await getSessionFromRequest(req)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (session.mustChangePassword) {
    return NextResponse.json(
      { error: 'Change your initial password before continuing.', code: 'PASSWORD_CHANGE_REQUIRED' },
      { status: 403 }
    )
  }
  if (!hasRole(session, minimum)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  return session
}
