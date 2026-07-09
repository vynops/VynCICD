import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth'
import { loadDeployments, saveDeployments } from '@/lib/data-store'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireRole(req, 'editor')
  if (auth instanceof NextResponse) return auth
  const { id } = await params
  const deps = loadDeployments()
  const idx = deps.findIndex(d => d.id === id)
  if (idx === -1) return NextResponse.json({ error: 'Deployment not found' }, { status: 404 })
  deps[idx] = {
    ...deps[idx],
    status: 'rolled_back',
    rolledBack: true,
    rollbackReason: `Manual rollback initiated at ${new Date().toISOString()}`,
  }
  saveDeployments(deps)
  return NextResponse.json({ ok: true, deployment: deps[idx] })
}
