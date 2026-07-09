import { NextRequest, NextResponse } from 'next/server'
import { getSettings } from '@/lib/settings-store'
import { processWebhookPush } from '@/lib/webhook-utils'

export async function POST(req: NextRequest) {
  const tokenHeader = req.headers.get('x-gitlab-token') ?? ''
  const secret = getSettings().gitlabWebhookSecret

  // GitLab uses a plain shared secret (not HMAC) — compare directly
  if (secret && tokenHeader !== secret) {
    return NextResponse.json({ error: 'invalid token' }, { status: 401 })
  }

  const event = req.headers.get('x-gitlab-event') ?? ''
  if (event !== 'Push Hook' && event !== 'Tag Push Hook') {
    return NextResponse.json({ ok: true, skipped: 'not a push event' })
  }

  let payload: Record<string, unknown>
  try {
    payload = await req.json() as Record<string, unknown>
  } catch {
    return NextResponse.json({ error: 'invalid json' }, { status: 400 })
  }

  // GitLab push payload format
  const ref = (payload.ref as string) ?? 'refs/heads/main'
  const branch = ref.replace(/^refs\/heads\//, '')
  const commitsArr = payload.commits as Record<string, unknown>[] | undefined
  const headCommit = commitsArr?.[0]
  const commit = (payload.checkout_sha as string ?? headCommit?.id as string) ?? 'unknown'
  const commitMessage = (headCommit?.message as string) ?? ''
  const author = ((headCommit?.author as Record<string, string>)?.name) ?? (payload.user_name as string) ?? 'unknown'
  const authorEmail = ((headCommit?.author as Record<string, string>)?.email) ?? ''
  const project = payload.project as Record<string, unknown> | undefined
  const fullName = (project?.path_with_namespace as string)
    ?? (payload.path_with_namespace as string)
    ?? ''

  const created = processWebhookPush({ fullName, branch, commit, commitMessage, author, authorEmail, provider: 'gitlab' })

  if (created.length === 0)
    return NextResponse.json({ ok: true, message: 'no matching pipelines', fullName, branch })

  return NextResponse.json({ ok: true, runs: created }, { status: 201 })
}
