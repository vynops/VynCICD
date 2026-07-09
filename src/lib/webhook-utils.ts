import {
  loadPipelines,
  loadRepos,
  saveRepos,
  addRun,
  savePipelines,
  type GitProvider,
  type StageRun,
} from '@/lib/data-store'

export interface PushPayload {
  fullName: string
  branch: string
  commit: string
  commitMessage: string
  author: string
  authorEmail: string
  provider: GitProvider
}

/** Find matching repo + pipelines, create run records. Returns run IDs created. */
export function processWebhookPush(payload: PushPayload): string[] {
  const { fullName, branch, commit, commitMessage, author, authorEmail, provider } = payload

  const repos = loadRepos()
  const repo = repos.find(r => r.fullName === fullName)

  const pipelines = loadPipelines()
  const triggered = pipelines.filter(p => {
    if (!p.enabled) return false
    if (!p.triggerOn.includes('push')) return false
    if (repo && p.repoId !== repo.id) return false
    if (!repo && p.repoFullName !== fullName) return false
    if (p.branch === '**' || p.branch === '*' || p.branch === branch) return true
    return false
  })

  if (triggered.length === 0) return []

  const created: string[] = []
  const now = new Date().toISOString()
  const cloneUrl = repo?.cloneUrl

  for (const pipeline of triggered) {
    const stageRuns: StageRun[] = pipeline.stages.map(s => ({
      name: s.name,
      type: s.type,
      run: s.run,
      image: s.image,
      manifest: s.manifest,
      environment: s.environment,
      clusterName: s.clusterName,
      allowFailure: s.allowFailure,
      status: 'pending',
      logs: [],
      retries: 0,
    }))

    const run = addRun({
      pipelineId: pipeline.id,
      pipelineName: pipeline.name,
      repoFullName: fullName,
      branch,
      commit: commit.slice(0, 8),
      commitMessage: commitMessage.slice(0, 200),
      author,
      authorEmail,
      trigger: 'push',
      status: 'pending',
      cloneUrl,
      provider,
      stages: stageRuns,
      startedAt: now,
    })

    const idx = pipelines.findIndex(p => p.id === pipeline.id)
    if (idx !== -1) {
      pipelines[idx].lastRunId = run.id
      pipelines[idx].lastRunStatus = 'pending'
      pipelines[idx].lastRunAt = now
      pipelines[idx].updatedAt = now
    }

    created.push(run.id)
    console.log(`[webhook:${provider}] pipeline=${pipeline.name} run=${run.id} branch=${branch} commit=${commit.slice(0, 8)}`)
  }

  savePipelines(pipelines)

  // Mark repo webhook as active on first successful push
  if (created.length > 0 && repo && !repo.webhookActive) {
    const allRepos = loadRepos()
    const idx = allRepos.findIndex(r => r.id === repo.id)
    if (idx !== -1) {
      allRepos[idx].webhookActive = true
      saveRepos(allRepos)
    }
  }

  return created
}
