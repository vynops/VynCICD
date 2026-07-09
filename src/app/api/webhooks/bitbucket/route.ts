import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { getSettings } from '@/lib/settings-store'
import { processWebhookPush } from '@/lib/webhook-utils'

function verifySignature(body: string, sigHeader: string | null, secret: string): boolean {
  if (!secret) return true
  if (!sigHeader) return false
  // Bitbucket Cloud sends x-hub-signature: sha256=...
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
  const sig = req.headers.get('x-hub-signature') ?? req.headers.get('x-hub-signature-256')
  const secret = getSettings().bitbucketWebhookSecret

  if (!verifySignature(rawBody, sig, secret)) {
    return NextResponse.json({ error: 'invalid signature' }, { status: 401 })
  }

  const event = req.headers.get('x-event-key') ?? ''
  if (event !== 'repo:push') return NextResponse.json({ ok: true, skipped: 'not a push event' })

  let payload: Record<string, unknown>
  try {
    payload = JSON.parse(rawBody)
  } catch {
    return NextResponse.json({ error: 'invalid json' }, { status: 400 })
  }

  // Bitbucket Cloud push payload format
  const push = payload.push as Record<string, unknown> | undefined
  const changes = push?.changes as Record<string, unknown>[] | undefined
  const change = changes?.[0]
  const newRef = change?.new as Record<string, unknown> | undefined
  const branch = (newRef?.name as string) ?? 'main'
  const commits = change?.commits as Record<string, unknown>[] | undefined
  const headCommit = commits?.[0]
  const commit = (headCommit?.hash as string) ?? 'unknown'
  const commitMessage = (headCommit?.message as string) ?? ''
  // Bitbucket author: { raw: "Name <email>" } or { user: { display_name } }
  const rawAuthor = headCommit?.author as Record<string, unknown> | undefined
  const authorRaw = (rawAuthor?.raw as string) ?? ''
  const author = (authorRaw.replace(/<.*>/, '').trim()) || ((rawAuthor?.user as Record<string, string>)?.display_name ?? 'unknown')
  const authorEmailMatch = authorRaw.match(/<([^>]+)>/)
  const authorEmail = authorEmailMatch?.[1] ?? ''
  const repository = payload.repository as Record<string, unknown> | undefined
  const fullName = (repository?.full_name as string) ?? ''

  const created = processWebhookPush({ fullName, branch, commit, commitMessage, author, authorEmail, provider: 'bitbucket' })

  if (created.length === 0)
    return NextResponse.json({ ok: true, message: 'no matching pipelines', fullName, branch })

  return NextResponse.json({ ok: true, runs: created }, { status: 201 })
}
