import { NextRequest, NextResponse } from 'next/server'
import { jwtVerify } from 'jose'

const PUBLIC_PATHS = ['/login', '/api/auth/login', '/api/auth/logout']
const RUNNER_API_PATHS = ['/api/runs', '/api/webhooks', '/api/alerts/incoming', '/api/deployments', '/api/security']

function isPublic(pathname: string): boolean {
  return PUBLIC_PATHS.some(p => pathname === p || pathname.startsWith(p + '/'))
}

function isRunnerPath(pathname: string): boolean {
  return RUNNER_API_PATHS.some(p => pathname === p || pathname.startsWith(p + '/'))
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  if (isPublic(pathname)) return NextResponse.next()

  // Allow runner agent and webhook calls through (they use x-runner-token header)
  if (isRunnerPath(pathname) && request.headers.has('x-runner-token')) {
    return NextResponse.next()
  }

  // Allow Gitea webhook posts (no runner token, but verified via HMAC in handler)
  if (pathname.startsWith('/api/webhooks/') && request.method === 'POST') {
    return NextResponse.next()
  }

  // Allow AlertManager webhook posts
  if (pathname === '/api/alerts/incoming' && request.method === 'POST') {
    return NextResponse.next()
  }

  const token = request.cookies.get('vyncicd_session')?.value
  if (!token) {
    const loginUrl = request.nextUrl.clone()
    loginUrl.pathname = '/login'
    return NextResponse.redirect(loginUrl)
  }

  try {
    const secret = new TextEncoder().encode(
      process.env.VYNCICD_SECRET ?? 'vyncicd-dev-fallback-change-in-production'
    )
    await jwtVerify(token, secret)
    return NextResponse.next()
  } catch {
    const loginUrl = request.nextUrl.clone()
    loginUrl.pathname = '/login'
    const response = NextResponse.redirect(loginUrl)
    response.cookies.delete('vyncicd_session')
    return response
  }
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|favicon-circle\\.png|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
