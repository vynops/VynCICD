import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth'
import { loadPipelines, savePipelines } from '@/lib/data-store'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireRole(req, 'editor')
  if (auth instanceof NextResponse) return auth
  const { id } = await params
  const body = await req.json()
  const pipelines = loadPipelines()
  const idx = pipelines.findIndex(p => p.id === id)
  if (idx === -1) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  pipelines[idx] = { ...pipelines[idx], ...body, updatedAt: new Date().toISOString() }
  savePipelines(pipelines)
  return NextResponse.json(pipelines[idx])
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireRole(req, 'admin')
  if (auth instanceof NextResponse) return auth
  const { id } = await params
  const pipelines = loadPipelines()
  const idx = pipelines.findIndex(p => p.id === id)
  if (idx === -1) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  savePipelines(pipelines.filter(p => p.id !== id))
  return new NextResponse(null, { status: 204 })
}
