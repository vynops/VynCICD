import { getSettings } from '@/lib/settings-store'
import https from 'node:https'
import http from 'node:http'

export interface ArgoApplicationStatus {
  metadata?: { name?: string }
  status?: {
    sync?: { status?: string; revision?: string }
    health?: { status?: string; message?: string }
    operationState?: { phase?: string; message?: string }
  }
}

function config() {
  const settings = getSettings()
  if (!settings.argoCdUrl || !settings.argoCdToken) {
    throw new Error('Argo CD URL and API token are required.')
  }
  return {
    baseUrl: settings.argoCdUrl.replace(/\/$/, ''),
    token: settings.argoCdToken,
  }
}

async function request(path: string, init: RequestInit = {}) {
  const { baseUrl, token } = config()
  const target = path.startsWith('http://') || path.startsWith('https://')
    ? path
    : `${baseUrl}/${path.replace(/^\//, '')}`
  const headers = new Headers(init.headers)
  headers.set('Authorization', `Bearer ${token}`)
  headers.set('Accept', 'application/json')
  const url = new URL(target)
  const response = await new Promise<{ status: number; body: string }>((resolve, reject) => {
    const client = url.protocol === 'https:' ? https : http
    const req = client.request({
      hostname: url.hostname,
      port: url.port || (url.protocol === 'https:' ? 443 : 80),
      path: `${url.pathname}${url.search}`,
      method: init.method ?? 'GET',
      headers: Object.fromEntries(headers.entries()),
      timeout: 10000,
      rejectUnauthorized: false,
    }, res => {
      let body = ''
      res.setEncoding('utf8')
      res.on('data', chunk => { body += chunk })
      res.on('end', () => resolve({ status: res.statusCode ?? 0, body }))
    })
    req.on('timeout', () => { req.destroy(new Error('Argo CD request timed out.')) })
    req.on('error', reject)
    if (init.body) req.write(init.body)
    req.end()
  })
  if (response.status < 200 || response.status >= 300) {
    const detail = response.body.trim().replace(/\s+/g, ' ').slice(0, 240)
    throw new Error(`Argo CD returned HTTP ${response.status}${detail ? `: ${detail}` : '.'}`)
  }
  return {
    ok: response.status >= 200 && response.status < 300,
    status: response.status,
    async json() { return JSON.parse(response.body) },
    async text() { return response.body },
  }
}

export async function testArgoCdConnection() {
  const response = await request('/api/version')
  const data = await response.json() as { Version?: string; version?: string }
  return data.Version ?? data.version ?? 'reachable'
}

export async function getArgoApplication(name: string): Promise<ArgoApplicationStatus> {
  const response = await request(`/api/v1/applications/${encodeURIComponent(name)}`)
  return response.json() as Promise<ArgoApplicationStatus>
}

export async function syncArgoApplication(name: string, project?: string) {
  const response = await request(`/api/v1/applications/${encodeURIComponent(name)}/sync`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prune: false, dryRun: false, project: project || undefined }),
  })
  return response.json() as Promise<{ operation?: { initiatedAt?: string } }>
}
