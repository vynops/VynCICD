import fs from 'fs'
import path from 'path'
import crypto from 'crypto'

const DATA = path.join(process.cwd(), 'data')
const ensure = () => { if (!fs.existsSync(DATA)) fs.mkdirSync(DATA, { recursive: true }) }

function load<T>(file: string, def: T): T {
  ensure()
  const f = path.join(DATA, file)
  if (!fs.existsSync(f)) return def
  try { return JSON.parse(fs.readFileSync(f, 'utf8')) as T } catch { return def }
}
function save(file: string, data: unknown) {
  ensure()
  fs.writeFileSync(path.join(DATA, file), JSON.stringify(data, null, 2), 'utf8')
}

// ─── Repository ───────────────────────────────────────────────────────────────
export type GitProvider = 'github' | 'gitlab' | 'bitbucket' | 'gitea'
export interface Repository {
  id: string
  owner: string
  name: string
  fullName: string
  provider: GitProvider
  defaultBranch: string
  private: boolean
  language: string
  description: string
  connectedAt: string
  webhookActive: boolean
  cloneUrl?: string
  lastRunAt?: string
  lastRunStatus?: PipelineRunStatus
  _demo?: boolean
}

// ─── Pipeline ─────────────────────────────────────────────────────────────────
export interface PipelineStage {
  name: string
  type: 'run' | 'test' | 'build' | 'scan' | 'deploy' | 'notify' | 'manual'
  run?: string
  image?: string
  manifest?: string
  dependsOn?: string[]
  allowFailure?: boolean
  timeoutMinutes?: number
  retryCount?: number
  environment?: string
  clusterName?: string    // explicit k8s context — overrides environment's clusterName
  condition?: string
  parallel?: boolean
}

export interface Pipeline {
  executionMode?: 'native' | 'jenkinsfile' | 'argocd'
  id: string
  name: string
  repoId: string
  repoFullName: string
  branch: string            // trigger branch pattern e.g. 'main', '**'
  triggerOn: ('push' | 'pull_request' | 'tag' | 'schedule' | 'manual')[]
  schedule?: string         // cron expression
  stages: PipelineStage[]
  environments: string[]    // which environments this deploys to
  enabled: boolean
  createdAt: string
  updatedAt: string
  lastRunId?: string
  lastRunStatus?: PipelineRunStatus
  lastRunAt?: string
  jenkinsJob?: string
  jenkinsfilePath?: string
  jenkinsParameters?: Record<string, string>
  argoCdApplication?: string
  argoCdProject?: string
  _demo?: boolean
}

// ─── Pipeline Run ─────────────────────────────────────────────────────────────
export type PipelineRunStatus = 'pending' | 'running' | 'success' | 'failed' | 'cancelled' | 'skipped'

export interface StageRun {
  name: string
  type?: PipelineStage['type']
  run?: string
  image?: string
  manifest?: string
  environment?: string
  clusterName?: string
  allowFailure?: boolean
  status: PipelineRunStatus
  startedAt?: string
  finishedAt?: string
  durationMs?: number
  exitCode?: number
  logs: string[]
  retries: number
}

export interface PipelineRun {
  id: string
  pipelineId: string
  pipelineName: string
  repoFullName: string
  branch: string
  commit: string
  commitMessage: string
  author: string
  authorEmail: string
  trigger: 'push' | 'pull_request' | 'tag' | 'schedule' | 'manual'
  status: PipelineRunStatus
  cloneUrl?: string
  provider?: GitProvider
  stages: StageRun[]
  startedAt: string
  finishedAt?: string
  durationMs?: number
  environment?: string
  error?: string
  executionMode?: 'native' | 'jenkinsfile' | 'argocd'
  jenkinsQueueUrl?: string
  jenkinsBuildNumber?: number
  jenkinsBuildUrl?: string
  argoCdApplication?: string
  argoCdSyncStatus?: string
  argoCdHealthStatus?: string
  argoCdUrl?: string
  aiTriage?: string
  _demo?: boolean
}

// ─── Environment ─────────────────────────────────────────────────────────────
export type EnvType = 'development' | 'staging' | 'production' | 'preview' | 'custom'
export interface Environment {
  id: string
  name: string
  type: EnvType
  url?: string
  clusterName?: string     // k8s cluster context — passed as $DEPLOY_CLUSTER to runner
  k8sNamespace?: string    // k8s namespace — passed as $DEPLOY_NAMESPACE to runner
  protected: boolean
  requiresApproval: boolean
  approvers: string[]    // user emails
  variables: Record<string, string>
  createdAt: string
}

// ─── Deployment ───────────────────────────────────────────────────────────────
export type DeployStatus = 'pending' | 'running' | 'healthy' | 'degraded' | 'failed' | 'rolled_back'
export interface Deployment {
  id: string
  runId: string
  pipelineName: string
  repoFullName: string
  environment: string
  version: string
  commit: string
  author: string
  status: DeployStatus
  healthGatePassed: boolean
  rolledBack: boolean
  rollbackReason?: string
  deployedAt: string
  finishedAt?: string
  durationMs?: number
  k8sNamespace?: string
  image?: string
  canaryPct?: number
  _demo?: boolean
}

// ─── Security Scan ───────────────────────────────────────────────────────────
export type VulnSeverity = 'critical' | 'high' | 'medium' | 'low' | 'informational'
export interface Vulnerability {
  id: string
  packageName: string
  installedVersion: string
  fixedVersion?: string
  severity: VulnSeverity
  cvss?: number
  description: string
  cveId?: string
}
export interface SecurityScan {
  id: string
  runId: string
  repoFullName: string
  image?: string
  scanType: 'container' | 'sast' | 'secret' | 'sbom' | 'dast'
  status: 'passed' | 'failed' | 'warning' | 'skipped'
  vulnerabilities: Vulnerability[]
  secretsFound: number
  sbomArtifactUrl?: string
  scannedAt: string
  blockedBuild: boolean
  _demo?: boolean
}

// ─── CRUD ─────────────────────────────────────────────────────────────────────
export function loadRepos(): Repository[] { return load('repos.json', []) }
export function saveRepos(r: Repository[]) { save('repos.json', r) }
export function addRepo(data: Omit<Repository, 'id' | 'connectedAt'>): Repository {
  const repos = loadRepos()
  const repo: Repository = { ...data, id: crypto.randomUUID(), connectedAt: new Date().toISOString() }
  repos.push(repo)
  saveRepos(repos)
  return repo
}

export function loadPipelines(): Pipeline[] { return load('pipelines.json', []) }
export function savePipelines(p: Pipeline[]) { save('pipelines.json', p) }

export function loadRuns(): PipelineRun[] { return load('runs.json', []) }
export function saveRuns(r: PipelineRun[]) { save('runs.json', r) }
export function addRun(run: Omit<PipelineRun, 'id'>): PipelineRun {
  const runs = loadRuns()
  const r: PipelineRun = { ...run, id: crypto.randomUUID() }
  runs.unshift(r)
  // Keep last 500 runs
  saveRuns(runs.slice(0, 500))
  return r
}

export function loadEnvironments(): Environment[] { return load('environments.json', []) }
export function saveEnvironments(e: Environment[]) { save('environments.json', e) }

export function loadDeployments(): Deployment[] { return load('deployments.json', []) }
export function saveDeployments(d: Deployment[]) { save('deployments.json', d) }
export function addDeployment(data: Omit<Deployment, 'id'>): Deployment {
  const deployments = loadDeployments()
  const d: Deployment = { ...data, id: crypto.randomUUID() }
  deployments.unshift(d)
  saveDeployments(deployments.slice(0, 200))
  return d
}

export function loadScans(): SecurityScan[] { return load('scans.json', []) }
export function saveScans(s: SecurityScan[]) { save('scans.json', s) }

// ─── Demo purge ───────────────────────────────────────────────────────────────
// Called automatically when the first real (non-demo) repo is connected.
// Strips all _demo: true records from every data file so the UI shows only
// real data from that point forward.
export function purgeDemo(): void {
  const repos = loadRepos().filter(r => !r._demo)
  saveRepos(repos)
  savePipelines(loadPipelines().filter(p => !p._demo))
  saveRuns(loadRuns().filter(r => !r._demo))
  saveDeployments(loadDeployments().filter(d => !d._demo))
  saveScans(loadScans().filter(s => !s._demo))
}

export function updateRun(id: string, patch: Partial<PipelineRun>): PipelineRun | null {
  const runs = loadRuns()
  const idx = runs.findIndex(r => r.id === id)
  if (idx === -1) return null
  runs[idx] = { ...runs[idx], ...patch }
  saveRuns(runs)
  return runs[idx]
}

export function appendStageLog(runId: string, stageName: string, lines: string[]): boolean {
  const runs = loadRuns()
  const run = runs.find(r => r.id === runId)
  if (!run) return false
  const stage = run.stages.find(s => s.name === stageName)
  if (!stage) return false
  stage.logs.push(...lines)
  saveRuns(runs)
  return true
}
