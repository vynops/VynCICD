import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth'
import { loadRepos, saveRepos } from '@/lib/data-store'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireRole(req, 'admin')
  if (auth instanceof NextResponse) return auth
  const { id } = await params
  let body: Record<string, unknown>
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }
  const repos = loadRepos()
  const idx = repos.findIndex(r => r.id === id)
  if (idx === -1) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  // Only allow editing safe fields — never overwrite id, fullName, connectedAt
  const { id: _i, fullName: _f, connectedAt: _c, ...allowed } = body as Record<string, unknown>
  repos[idx] = { ...repos[idx], ...(allowed as object) }
  saveRepos(repos)
  return NextResponse.json(repos[idx])
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireRole(req, 'admin')
  if (auth instanceof NextResponse) return auth
  const { id } = await params
  const repos = loadRepos()
  const filtered = repos.filter(r => r.id !== id)
  if (filtered.length === repos.length) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  saveRepos(filtered)
  return NextResponse.json({ ok: true })
}
