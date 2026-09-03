import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth'
import { getArgoApplication } from '@/lib/argocd'
import { loadRuns, updateRun, loadPipelines, savePipelines } from '@/lib/data-store'

function syncPipelineStatus(runId: string, status: string) {
  const run = loadRuns().find(item => item.id === runId)
  if (!run) return
  const pipelines = loadPipelines()
  const index = pipelines.findIndex(item => item.id === run.pipelineId)
  if (index === -1 || pipelines[index].lastRunId !== runId) return
  pipelines[index] = { ...pipelines[index], lastRunStatus: status as typeof pipelines[number]['lastRunStatus'] }
  savePipelines(pipelines)
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireRole(req, 'viewer')
  if (auth instanceof NextResponse) return auth
  const { id } = await params
  const run = loadRuns().find(item => item.id === id)
  if (!run || run.executionMode !== 'argocd' || !run.argoCdApplication) {
    return NextResponse.json({ error: 'Argo CD run not found' }, { status: 404 })
  }

  try {
    const app = await getArgoApplication(run.argoCdApplication)
    const sync = app.status?.sync?.status ?? 'Unknown'
    const health = app.status?.health?.status ?? 'Unknown'
    const operation = app.status?.operationState?.phase ?? ''
    const terminal = health === 'Healthy' && sync === 'Synced'
    const failed = ['Failed', 'Error'].includes(operation) || health === 'Degraded'
    const status = terminal ? 'success' : failed ? 'failed' : 'running'
    const patch = {
      status: status as 'success' | 'failed' | 'running',
      argoCdSyncStatus: sync,
      argoCdHealthStatus: health,
      ...(terminal || failed ? { finishedAt: new Date().toISOString() } : {}),
      ...(failed ? { error: app.status?.health?.message ?? `Argo CD operation ${operation || health}.` } : {}),
    }
    const updated = updateRun(id, patch)
    syncPipelineStatus(id, status)
    return NextResponse.json({ run: updated ?? run, application: app })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Argo CD polling failed.' }, { status: 502 })
  }
}
