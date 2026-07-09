import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { getSettings } from '@/lib/settings-store'
import { processWebhookPush } from '@/lib/webhook-utils'

function verifySignature(body: string, sigHeader: string | null, secret: string): boolean {
  if (!secret) return true // no secret configured — allow all (not recommended for prod)
  if (!sigHeader) return false
  const expected = crypto.createHmac('sha256', secret).update(body).digest('hex')
  const actual = sigHeader.replace(/^sha256=/, '')
  try {
    return crypto.timingSafeEqual(Buffer.from(expected, 'hex'), Buffer.from(actual, 'hex'))
  } catch {
    return false
  }
}

export async function POST(req: NextRequest) {
  const rawBody = await req.text()
  const sig = req.headers.get('x-hub-signature-256')
  const secret = getSettings().githubWebhookSecret

  if (!verifySignature(rawBody, sig, secret)) {
    return NextResponse.json({ error: 'invalid signature' }, { status: 401 })
  }

  const event = req.headers.get('x-github-event') ?? ''
  if (event !== 'push') return NextResponse.json({ ok: true, skipped: 'not a push event' })

  let payload: Record<string, unknown>
  try {
    payload = JSON.parse(rawBody)
  } catch {
    return NextResponse.json({ error: 'invalid json' }, { status: 400 })
  }

  const ref = (payload.ref as string) ?? 'refs/heads/main'
  const branch = ref.replace(/^refs\/heads\//, '')
  const headCommit = payload.head_commit as Record<string, unknown> | undefined
  const commitsArr = payload.commits as Record<string, unknown>[] | undefined
  const commit_ = headCommit ?? commitsArr?.[0]
  const commit = (commit_?.id as string) ?? 'unknown'
  const commitMessage = (commit_?.message as string) ?? ''
  const author = ((commit_?.author as Record<string, string>)?.name) ?? 'unknown'
  const authorEmail = ((commit_?.author as Record<string, string>)?.email) ?? ''
  const repoPayload = payload.repository as Record<string, unknown>
  const fullName = (repoPayload?.full_name as string) ?? ''

  const created = processWebhookPush({ fullName, branch, commit, commitMessage, author, authorEmail, provider: 'github' })

  if (created.length === 0)
    return NextResponse.json({ ok: true, message: 'no matching pipelines', fullName, branch })

  return NextResponse.json({ ok: true, runs: created }, { status: 201 })
}
