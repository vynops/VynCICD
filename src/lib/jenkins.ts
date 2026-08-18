import { getSettings } from '@/lib/settings-store'

export interface JenkinsBuildState {
  building: boolean
  result: string | null
  number?: number
  url?: string
  fullDisplayName?: string
}

function config() {
  const s = getSettings()
  if (!s.jenkinsUrl || !s.jenkinsUsername || !s.jenkinsApiToken) {
    throw new Error('Jenkins URL, username, and API token are required.')
  }
  return {
    baseUrl: s.jenkinsUrl.replace(/\/$/, ''),
    auth: `Basic ${Buffer.from(`${s.jenkinsUsername}:${s.jenkinsApiToken}`).toString('base64')}`,
  }
}

async function request(path: string, init: RequestInit = {}) {
  const c = config()
  const headers = new Headers(init.headers)
  headers.set('Authorization', c.auth)
  headers.set('Accept', 'application/json')
  const target = path.startsWith('http://') || path.startsWith('https://')
    ? path
    : `${c.baseUrl}/${path.replace(/^\//, '')}`
  const requestInit: RequestInit = {
    ...init,
    headers,
    signal: AbortSignal.timeout(10000),
  }
  if (init.method && init.method !== 'GET') {
    const crumbResponse = await fetch(`${c.baseUrl}/crumbIssuer/api/json`, {
      headers: { Authorization: c.auth, Accept: 'application/json' },
      signal: AbortSignal.timeout(10000),
    })
    if (crumbResponse.ok) {
      const crumb = await crumbResponse.json() as { crumbRequestField?: string; crumb?: string }
      if (crumb.crumbRequestField && crumb.crumb) headers.set(crumb.crumbRequestField, crumb.crumb)
      const setCookie = crumbResponse.headers.get('set-cookie')
      if (setCookie) headers.set('Cookie', setCookie.split(';')[0])
    }
  }
  const response = await fetch(target, requestInit)
  if (!response.ok) {
    const detail = (await response.text().catch(() => '')).trim().replace(/\s+/g, ' ').slice(0, 240)
    throw new Error(`Jenkins returned HTTP ${response.status}${detail ? `: ${detail}` : '.'}`)
  }
  return response
}

export async function testJenkinsConnection() {
  const response = await request('/api/json')
  const data = await response.json() as { displayName?: string; version?: string }
  return {
    displayName: data.displayName ?? 'Jenkins',
    version: response.headers.get('x-jenkins') ?? data.version ?? 'reachable',
  }
}

export async function triggerJenkinsJob(job: string, parameters: Record<string, string>) {
  const encodedJob = job.split('/').map(encodeURIComponent).join('/').replace(/%2F/g, '/')
  const entries = Object.entries(parameters).filter(([, value]) => value !== '')
  const query = new URLSearchParams(entries)
  const endpoint = entries.length > 0
    ? `/job/${encodedJob}/buildWithParameters?${query.toString()}`
    : `/job/${encodedJob}/build`
  const response = await request(endpoint, { method: 'POST' })
  const queueUrl = response.headers.get('location')
  if (!queueUrl) throw new Error('Jenkins did not return a queue URL.')
  return { queueUrl }
}

export async function getJenkinsQueue(queueUrl: string) {
  const response = await request(`${queueUrl.replace(/\/$/, '')}/api/json`)
  return await response.json() as { cancelled?: boolean; why?: string; executable?: { number: number; url: string } }
}

export async function getJenkinsBuild(buildUrl: string): Promise<JenkinsBuildState> {
  const response = await request(`${buildUrl.replace(/\/$/, '')}/api/json`)
  return await response.json() as JenkinsBuildState
}

export async function getJenkinsConsole(buildUrl: string) {
  const c = config()
  const response = await fetch(`${buildUrl.replace(/\/$/, '')}/consoleText`, {
    headers: { Authorization: c.auth },
    signal: AbortSignal.timeout(10000),
  })
  if (!response.ok) throw new Error(`Jenkins returned HTTP ${response.status}.`)
  return response.text()
}