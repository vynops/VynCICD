import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { processWebhookPush } from '@/lib/webhook-utils'

const WEBHOOK_SECRET = process.env.GITEA_WEBHOOK_SECRET ?? ''

function verifySignature(body: string, sigHeader: string | null): boolean {
  if (!sigHeader || !WEBHOOK_SECRET) return !WEBHOOK_SECRET
  const expected = crypto.createHmac('sha256', WEBHOOK_SECRET).update(body).digest('hex')
  const actual = sigHeader.replace(/^sha256=/, '')
  try {
    return crypto.timingSafeEqual(Buffer.from(expected, 'hex'), Buffer.from(actual, 'hex'))
  } catch {
    return false
  }
}

export async function POST(req: NextRequest) {
  const rawBody = await req.text()
  const sig = req.headers.get('x-gitea-signature') ?? req.headers.get('x-hub-signature-256')
  if (!verifySignature(rawBody, sig)) {
    return NextResponse.json({ error: 'invalid signature' }, { status: 401 })
  }

  let payload: Record<string, unknown>
  try {
    payload = JSON.parse(rawBody)
  } catch {
    return NextResponse.json({ error: 'invalid json' }, { status: 400 })
  }

  const event = req.headers.get('x-gitea-event') ?? req.headers.get('x-github-event') ?? 'push'
  if (event !== 'push') return NextResponse.json({ ok: true, skipped: 'not a push event' })

  const ref = (payload.ref as string) ?? 'refs/heads/main'
  const branch = ref.replace(/^refs\/heads\//, '')
  const commitsArr = payload.commits as Record<string, unknown>[] | undefined
  const headCommit = (payload.head_commit ?? commitsArr?.[0]) as Record<string, unknown> | undefined
  const commit = (headCommit?.id as string) ?? 'unknown'
  const commitMessage = (headCommit?.message as string) ?? ''
  const author = ((headCommit?.author as Record<string, string>)?.name) ?? 'unknown'
  const authorEmail = ((headCommit?.author as Record<string, string>)?.email) ?? ''
  const repoPayload = payload.repository as Record<string, unknown>
  const fullName = (repoPayload?.full_name as string) ?? ''

  const created = processWebhookPush({ fullName, branch, commit, commitMessage, author, authorEmail, provider: 'gitea' })

  if (created.length === 0)
    return NextResponse.json({ ok: true, message: 'no matching pipelines', fullName, branch })

  return NextResponse.json({ ok: true, runs: created }, { status: 201 })
}
