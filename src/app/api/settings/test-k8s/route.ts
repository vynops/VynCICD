import { NextRequest, NextResponse } from 'next/server'
import https from 'node:https'
import http from 'node:http'
import fs from 'node:fs'
import { requireRole } from '@/lib/auth'
import { getSettings } from '@/lib/settings-store'

interface TestResult {
  success: boolean
  message: string
  suggestedUrl?: string
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

function extractKubeconfigServers(content: string): string[] {
  const servers = new Set<string>()
  for (const line of content.split('\n')) {
    const m = line.match(/^\s*server:\s*(\S+)/)
    if (m?.[1]) servers.add(m[1].trim())
  }
  return Array.from(servers)
}

function normalizeLoopback(url: string): string {
  try {
    const u = new URL(url)
    if (u.hostname === '0.0.0.0') u.hostname = '127.0.0.1'
    return u.toString().replace(/\/$/, '')
  } catch {
    return url
  }
}

async function suggestK8sUrl(kubeconfigPath?: string): Promise<string | null> {
  if (!kubeconfigPath || !fs.existsSync(kubeconfigPath)) return null
  const content = fs.readFileSync(kubeconfigPath, 'utf8')
  const servers = extractKubeconfigServers(content).map(normalizeLoopback)
  let firstReachable: string | null = null
  for (const s of servers) {
    try {
      const r = await rawFetch(`${s}/version`, { timeout: 2500 })
      if (r.status === 200 || r.status === 401 || r.status === 403) {
        firstReachable = s
        break
      }
    } catch {
      // keep trying candidates
    }
  }
  // Avoid suggesting stale ports when none are reachable.
  return firstReachable
}

export async function POST(req: NextRequest) {
  const auth = await requireRole(req, 'viewer')
  if (auth instanceof NextResponse) return auth

  const { target, url } = await req.json() as { target: string; url?: string }
  const s = getSettings()
  let attempted = ''

  try {
    /* ── Kubernetes API ── */
    if (target === 'k8s') {
      const effectiveUrl = (url && url.trim()) ? url.trim() : s.k8sApiUrl

      if (!effectiveUrl)
        return NextResponse.json<TestResult>({ success: false, message: 'K8s API URL not configured.' })

      attempted = `${effectiveUrl}/version`
      const r = await rawFetch(attempted, { token: s.k8sToken || undefined })

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
        attempted = `${base}/v2/`
        const r = await rawFetch(attempted, { timeout: 6000 })
        if (r.status === 200)
          return NextResponse.json<TestResult>({ success: true, message: 'Registry reachable · open (no auth required)' })
        if (r.status === 401)
          return NextResponse.json<TestResult>({ success: true, message: 'Registry reachable · auth required — configure Username + Password to authenticate.' })
        return NextResponse.json<TestResult>({ success: false, message: `HTTP ${r.status} — unexpected response.` })
      }

      // Tier 2: credentials set — try Basic auth
      const creds = Buffer.from(`${s.registryUsername}:${s.registryPassword}`).toString('base64')
      attempted = `${base}/v2/`
      const r = await rawFetch(attempted, { basicAuth: creds, timeout: 6000 })
      if (r.status === 200)
        return NextResponse.json<TestResult>({ success: true, message: `Authenticated as ${s.registryUsername} · registry accessible.` })
      if (r.status === 401)
        return NextResponse.json<TestResult>({ success: false, message: 'Invalid credentials — check username and password/token.' })
      return NextResponse.json<TestResult>({ success: false, message: `HTTP ${r.status} — unexpected response.` })
    }

    return NextResponse.json<TestResult>({ success: false, message: `Unknown target: ${target}` })
  } catch (e) {
    const err = e as NodeJS.ErrnoException & { cause?: { code?: string } }
    const code = err.code ?? err.cause?.code ?? ''
    const friendly: Record<string, string> = {
      ECONNREFUSED: 'Connection refused — check the URL/port.',
      ENOTFOUND:    'Host not found — check the URL.',
      ETIMEDOUT:    'Timed out — host unreachable from this server.',
    }
    const where = attempted ? ` Endpoint: ${attempted}.` : ''
    const codePart = code ? ` [${code}]` : ''
    const detail = (err.message && err.message.trim().length > 0) ? ` ${err.message}` : ''
    if (target === 'k8s' && code === 'ECONNREFUSED') {
      const suggestedUrl = await suggestK8sUrl(s.k8sKubeconfig)
      if (suggestedUrl) {
        return NextResponse.json<TestResult>({
          success: false,
          message: `${friendly[code] ?? 'Connection test failed.'}${codePart}${where}${detail} Suggested URL from kubeconfig: ${suggestedUrl}`,
          suggestedUrl,
        })
      }
    }

    return NextResponse.json<TestResult>({ success: false, message: `${friendly[code] ?? 'Connection test failed.'}${codePart}${where}${detail}` })
  }
}
