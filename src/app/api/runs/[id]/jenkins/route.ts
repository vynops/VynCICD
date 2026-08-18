import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth'
import { getJenkinsBuild, getJenkinsConsole, getJenkinsQueue } from '@/lib/jenkins'
import { loadRuns, updateRun, loadPipelines, savePipelines } from '@/lib/data-store'

function syncPipelineStatus(runId: string, status: string) {
  const runs = loadRuns()
  const run = runs.find(item => item.id === runId)
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
  if (!run || run.executionMode !== 'jenkinsfile') return NextResponse.json({ error: 'Jenkins run not found' }, { status: 404 })

  if (run.status === 'pending' && run.jenkinsQueueUrl) {
    const queue = await getJenkinsQueue(run.jenkinsQueueUrl)
    if (queue.cancelled) {
      updateRun(id, { status: 'failed', error: queue.why ?? 'Jenkins queue item was cancelled.' })
      syncPipelineStatus(id, 'failed')
    } else if (queue.executable) {
      updateRun(id, { status: 'running', jenkinsBuildNumber: queue.executable.number, jenkinsBuildUrl: queue.executable.url })
      syncPipelineStatus(id, 'running')
    }
  }

  const current = loadRuns().find(item => item.id === id) ?? run
  if (current.jenkinsBuildUrl && (current.status === 'running' || current.status === 'pending')) {
    const build = await getJenkinsBuild(current.jenkinsBuildUrl)
    if (!build.building && build.result) {
      const finishedAt = new Date().toISOString()
      updateRun(id, {
        status: build.result === 'SUCCESS' ? 'success' : build.result === 'ABORTED' ? 'cancelled' : 'failed',
        error: build.result === 'SUCCESS' ? undefined : `Jenkins build finished with ${build.result}.`,
        jenkinsBuildNumber: build.number,
        jenkinsBuildUrl: build.url,
        finishedAt,
        durationMs: current.startedAt ? new Date(finishedAt).getTime() - new Date(current.startedAt).getTime() : undefined,
      })
      syncPipelineStatus(id, build.result === 'SUCCESS' ? 'success' : build.result === 'ABORTED' ? 'cancelled' : 'failed')
    }
  }

  const latest = loadRuns().find(item => item.id === id) ?? current
  let consoleText = ''
  if (latest.jenkinsBuildUrl) consoleText = await getJenkinsConsole(latest.jenkinsBuildUrl).catch(() => '')
  return NextResponse.json({ run: latest, consoleText })
}