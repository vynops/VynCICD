import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth'
import { getSettings } from '@/lib/settings-store'

interface TestResult {
  success: boolean
  message: string
  info?: Record<string, unknown>
}

export async function POST(req: NextRequest) {
  const auth = await requireRole(req, 'viewer')
  if (auth instanceof NextResponse) return auth

  // Accept inline credentials from request body (test before saving)
  // Falls back to saved settings if not provided
  const body = await req.json() as {
    provider: string
    token?: string
    url?: string
    webhookSecret?: string
    username?: string
    appPassword?: string
  }
  const { provider } = body
  const saved = getSettings()

  // Merge: inline body takes precedence over saved settings
  const s = {
    ...saved,
    giteaUrl:              body.url      || saved.giteaUrl,
    giteaToken:            body.token    || saved.giteaToken,
    githubToken:           body.token    || saved.githubToken,
    gitlabToken:           body.token    || saved.gitlabToken,
    gitlabUrl:             body.url      || saved.gitlabUrl,
    bitbucketAppPassword:  body.appPassword  || saved.bitbucketAppPassword,
    bitbucketUsername:     body.username  || saved.bitbucketUsername,
  }

  try {
    if (provider === 'gitea') {
      if (!s.giteaUrl || !s.giteaToken)
        return NextResponse.json<TestResult>({ success: false, message: 'Gitea URL and token are required.' })

      const res = await fetch(`${s.giteaUrl}/api/v1/user`, {
        headers: { Authorization: `token ${s.giteaToken}`, 'Content-Type': 'application/json' },
        signal: AbortSignal.timeout(6000),
      })
      if (!res.ok)
        return NextResponse.json<TestResult>({ success: false, message: `HTTP ${res.status} — check URL and token.` })

      const user = await res.json() as { login?: string; email?: string; full_name?: string }
      return NextResponse.json<TestResult>({
        success: true,
        message: `Connected as ${user.login}${user.email ? ` (${user.email})` : ''}`,
        info: user,
      })
    }

    if (provider === 'github') {
      if (!s.githubToken) {
        // No token — just check reachability
        try {
          await fetch('https://api.github.com', { method: 'HEAD', signal: AbortSignal.timeout(6000) })
        } catch {
          return NextResponse.json<TestResult>({ success: false, message: 'Cannot reach api.github.com — check network.' })
        }
        return NextResponse.json<TestResult>({
          success: false,
          message: 'GitHub API reachable but no token configured. Add your PAT to connect repositories.',
        })
      }

      // Full auth check via GitHub REST API
      const res = await fetch('https://api.github.com/user', {
        headers: {
          Authorization: `token ${s.githubToken}`,
          Accept: 'application/vnd.github+json',
          'X-GitHub-Api-Version': '2022-11-28',
          'User-Agent': 'VynCICD/1.0',
        },
        signal: AbortSignal.timeout(8000),
      })

      if (res.status === 401)
        return NextResponse.json<TestResult>({ success: false, message: 'Invalid token — check your GitHub PAT (needs repo and read:user scopes).' })
      if (!res.ok)
        return NextResponse.json<TestResult>({ success: false, message: `GitHub API returned HTTP ${res.status}.` })

      const user = await res.json() as { login?: string; name?: string; plan?: { name?: string } }
      const rateRemaining = res.headers.get('x-ratelimit-remaining') ?? '?'
      return NextResponse.json<TestResult>({
        success: true,
        message: `Connected as @${user.login}${user.name ? ` (${user.name})` : ''} · ${rateRemaining} API req/hr remaining`,
        info: user,
      })
    }

    if (provider === 'gitlab') {
      // Tier 1: no token — HEAD the root domain (any HTTP response = reachable)
      if (!s.gitlabToken) {
        const res = await fetch('https://gitlab.com', {
          method: 'HEAD',
          signal: AbortSignal.timeout(6000),
        })
        return NextResponse.json<TestResult>({
          success: true,
          message: `GitLab reachable (HTTP ${res.status}) — no token configured yet.`,
        })
      }

      // Tier 2: full auth
      const res = await fetch('https://gitlab.com/api/v4/user', {
        headers: { 'PRIVATE-TOKEN': s.gitlabToken },
        signal: AbortSignal.timeout(6000),
      })
      if (!res.ok)
        return NextResponse.json<TestResult>({ success: false, message: `HTTP ${res.status} — invalid token or self-hosted URL not configured.` })

      const user = await res.json() as { username?: string; name?: string }
      return NextResponse.json<TestResult>({
        success: true,
        message: `Connected as @${user.username} (${user.name})`,
        info: user,
      })
    }

    if (provider === 'bitbucket') {
      // Tier 1: no credentials — HEAD the root domain
      if (!s.bitbucketAppPassword) {
        const res = await fetch('https://bitbucket.org', {
          method: 'HEAD',
          signal: AbortSignal.timeout(6000),
        })
        return NextResponse.json<TestResult>({
          success: true,
          message: `Bitbucket reachable (HTTP ${res.status}) — no credentials configured yet.`,
        })
      }

      // Tier 2: has app password but no username field — partial
      return NextResponse.json<TestResult>({
        success: true,
        message: 'App password set. Add a Bitbucket username field to settings for full authenticated test.',
      })
    }

    return NextResponse.json<TestResult>({ success: false, message: `Unknown provider: ${provider}` })
  } catch (e) {
    const err = e as { message?: string; cause?: { code?: string; message?: string; name?: string } }
    const code = err.cause?.code ?? err.cause?.name ?? ''
    const friendly: Record<string, string> = {
      ECONNREFUSED: 'Connection refused — check the port.',
      ENOTFOUND:    'Host not found — check the URL.',
      ETIMEDOUT:    'Timed out — host unreachable from this server.',
      TimeoutError: 'Timed out — host unreachable from this server.',
      AbortError:   'Timed out — host unreachable from this server.',
    }
    const msg = friendly[code] ?? err.cause?.message ?? err.message ?? String(e)
    return NextResponse.json<TestResult>({ success: false, message: msg })
  }
}
