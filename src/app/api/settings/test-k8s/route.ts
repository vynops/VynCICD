import { NextRequest, NextResponse } from 'next/server'
import https from 'node:https'
import http from 'node:http'
import fs from 'node:fs'
import { requireRole } from '@/lib/auth'
import { getSettings } from '@/lib/settings-store'

interface TestResult {
  success: boolean
  message: string
}

/** Raw HTTP/HTTPS fetch that ignores self-signed TLS — needed for k3d clusters */
function rawFetch(url: string, opts: { token?: string; basicAuth?: string; timeout?: number } = {}): Promise<{ status: number; body: string }> {
  return new Promise((resolve, reject) => {
    const u = new URL(url)
    const isHttps = u.protocol === 'https:'
    const agent = isHttps ? new https.Agent({ rejectUnauthorized: false }) : undefined
    const headers: Record<string, string> = {}
    if (opts.token) headers['Authorization'] = `Bearer ${opts.token}`
    if (opts.basicAuth) headers['Authorization'] = `Basic ${opts.basicAuth}`

    const reqLib = isHttps ? https : http
    const req = reqLib.request(
      { hostname: u.hostname, port: u.port || (isHttps ? 443 : 80), path: u.pathname + u.search, method: 'GET', agent, headers, timeout: opts.timeout ?? 6000 },
      (res) => {
        let body = ''
        res.on('data', (chunk: Buffer) => { body += chunk.toString() })
        res.on('end', () => resolve({ status: res.statusCode ?? 0, body }))
      }
    )
    req.on('error', reject)
    req.on('timeout', () => { req.destroy(); reject(Object.assign(new Error('ETIMEDOUT'), { cause: { code: 'ETIMEDOUT' } })) })
    req.end()
  })
}

export async function POST(req: NextRequest) {
  const auth = await requireRole(req, 'viewer')
  if (auth instanceof NextResponse) return auth

  const { target } = await req.json() as { target: string }
  const s = getSettings()

  try {
    /* ── Kubernetes API ── */
    if (target === 'k8s') {
      if (!s.k8sApiUrl)
        return NextResponse.json<TestResult>({ success: false, message: 'K8s API URL not configured.' })

      const r = await rawFetch(`${s.k8sApiUrl}/version`, { token: s.k8sToken || undefined })

      if (r.status === 200) {
        const data = JSON.parse(r.body) as { gitVersion?: string }
        const authed = s.k8sToken ? ' · token auth' : ' · unauthenticated'
        return NextResponse.json<TestResult>({ success: true, message: `Connected · Kubernetes ${data.gitVersion ?? '?'}${authed}` })
      }
      if (r.status === 401 || r.status === 403) {
        if (!s.k8sToken)
          return NextResponse.json<TestResult>({ success: true, message: `API reachable · auth required — configure a Service Account Token to authenticate.` })
        return NextResponse.json<TestResult>({ success: false, message: `HTTP ${r.status} — token invalid or insufficient permissions.` })
      }

      return NextResponse.json<TestResult>({ success: false, message: `HTTP ${r.status} — unexpected response.` })
    }

    /* ── Kubeconfig file ── */
    if (target === 'kubeconfig') {
      const kpath = s.k8sKubeconfig as string | undefined
      if (!kpath)
        return NextResponse.json<TestResult>({ success: false, message: 'Kubeconfig path not configured.' })
      if (!fs.existsSync(kpath))
        return NextResponse.json<TestResult>({ success: false, message: `File not found: ${kpath}` })

      const content = fs.readFileSync(kpath, 'utf8')
      const valid = content.includes('server:') && content.includes('clusters:')
      return NextResponse.json<TestResult>({
        success: true,
        message: `File readable${valid ? ' · valid kubeconfig structure' : ' — check content'}`,
      })
    }

    /* ── Container Registry ── */
    if (target === 'registry') {
      if (!s.registryUrl)
        return NextResponse.json<TestResult>({ success: false, message: 'Registry URL not configured.' })

      const base = s.registryUrl.startsWith('http') ? s.registryUrl : `http://${s.registryUrl}`

      // Tier 1: no credentials — plain reachability
      if (!s.registryUsername) {
        const r = await rawFetch(`${base}/v2/`, { timeout: 6000 })
        if (r.status === 200)
          return NextResponse.json<TestResult>({ success: true, message: 'Registry reachable · open (no auth required)' })
        if (r.status === 401)
          return NextResponse.json<TestResult>({ success: true, message: 'Registry reachable · auth required — configure Username + Password to authenticate.' })
        return NextResponse.json<TestResult>({ success: false, message: `HTTP ${r.status} — unexpected response.` })
      }

      // Tier 2: credentials set — try Basic auth
      const creds = Buffer.from(`${s.registryUsername}:${s.registryPassword}`).toString('base64')
      const r = await rawFetch(`${base}/v2/`, { basicAuth: creds, timeout: 6000 })
      if (r.status === 200)
        return NextResponse.json<TestResult>({ success: true, message: `Authenticated as ${s.registryUsername} · registry accessible.` })
      if (r.status === 401)
        return NextResponse.json<TestResult>({ success: false, message: 'Invalid credentials — check username and password/token.' })
      return NextResponse.json<TestResult>({ success: false, message: `HTTP ${r.status} — unexpected response.` })
    }

    return NextResponse.json<TestResult>({ success: false, message: `Unknown target: ${target}` })
  } catch (e) {
    const err = e as { cause?: { code?: string }; message?: string }
    const code = err.cause?.code ?? ''
    const friendly: Record<string, string> = {
      ECONNREFUSED: 'Connection refused — check the URL/port.',
      ENOTFOUND:    'Host not found — check the URL.',
      ETIMEDOUT:    'Timed out — host unreachable from this server.',
    }
    return NextResponse.json<TestResult>({ success: false, message: friendly[code] ?? err.message ?? String(e) })
  }
}
