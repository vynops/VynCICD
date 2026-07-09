/**
 * seed.ts — Seeds demo data into data/ JSON files so the UI looks populated on first run.
 * Called once from the overview API route when no data exists.
 */
import fs from 'fs'
import path from 'path'
import crypto from 'crypto'
import type { Repository, Pipeline, PipelineRun, Environment, Deployment, SecurityScan } from './data-store'
import type { Incident } from './oncall-store'

const DATA = path.join(process.cwd(), 'data')
const ensure = () => { if (!fs.existsSync(DATA)) fs.mkdirSync(DATA, { recursive: true }) }
const file = (name: string) => path.join(DATA, name)
const written = (name: string) => fs.existsSync(file(name))

function write(name: string, data: unknown) {
  ensure()
  fs.writeFileSync(file(name), JSON.stringify(data, null, 2), 'utf8')
}

function ago(minutes: number): string {
  return new Date(Date.now() - minutes * 60_000).toISOString()
}

export function seedIfEmpty(): void {
  if (written('repos.json')) return  // already seeded

  // ─── Repos ────────────────────────────────────────────────────────────────
  const repos: Repository[] = [
    { id: 'r1', owner: 'acme', name: 'api-service', fullName: 'acme/api-service', provider: 'github', defaultBranch: 'main', private: true,  language: 'TypeScript', description: 'REST API gateway', connectedAt: ago(10000), webhookActive: true, lastRunAt: ago(12), lastRunStatus: 'success', _demo: true },
    { id: 'r2', owner: 'acme', name: 'web-frontend', fullName: 'acme/web-frontend', provider: 'github', defaultBranch: 'main', private: false, language: 'TypeScript', description: 'Next.js frontend', connectedAt: ago(9000), webhookActive: true, lastRunAt: ago(45), lastRunStatus: 'failed', _demo: true },
    { id: 'r3', owner: 'acme', name: 'ml-pipeline', fullName: 'acme/ml-pipeline', provider: 'github', defaultBranch: 'main', private: true,  language: 'Python', description: 'ML training pipeline', connectedAt: ago(8000), webhookActive: true, lastRunAt: ago(180), lastRunStatus: 'success', _demo: true },
    { id: 'r4', owner: 'acme', name: 'auth-service', fullName: 'acme/auth-service', provider: 'gitlab', defaultBranch: 'main', private: true,  language: 'Go', description: 'Identity & auth service', connectedAt: ago(7000), webhookActive: true, lastRunAt: ago(360), lastRunStatus: 'success', _demo: true },
    { id: 'r5', owner: 'acme', name: 'infra-config', fullName: 'acme/infra-config', provider: 'github', defaultBranch: 'main', private: true,  language: 'HCL', description: 'Terraform infra config', connectedAt: ago(6000), webhookActive: false, lastRunAt: ago(720), lastRunStatus: 'success', _demo: true },
  ]
  write('repos.json', repos)

  // ─── Environments ─────────────────────────────────────────────────────────
  const envs: Environment[] = [
    { id: 'e1', name: 'development', type: 'development', url: 'https://dev.acme.internal', k8sNamespace: 'dev', protected: false, requiresApproval: false, approvers: [], variables: {}, createdAt: ago(10000) },
    { id: 'e2', name: 'staging', type: 'staging', url: 'https://staging.acme.internal', k8sNamespace: 'staging', protected: true, requiresApproval: false, approvers: [], variables: {}, createdAt: ago(10000) },
    { id: 'e3', name: 'production', type: 'production', url: 'https://api.acme.com', k8sNamespace: 'prod', protected: true, requiresApproval: true, approvers: ['admin@vyncicd.local'], variables: {}, createdAt: ago(10000) },
    { id: 'e4', name: 'preview', type: 'preview', url: undefined, k8sNamespace: 'preview', protected: false, requiresApproval: false, approvers: [], variables: {}, createdAt: ago(5000) },
  ]
  write('environments.json', envs)

  // ─── Pipelines ────────────────────────────────────────────────────────────
  const pipelines: Pipeline[] = [
    {
      id: 'p1', name: 'api-service CI/CD', repoId: 'r1', repoFullName: 'acme/api-service',
      branch: 'main', triggerOn: ['push', 'pull_request'],
      stages: [
        { name: 'test', type: 'test', run: 'npm test', timeoutMinutes: 10, retryCount: 1 },
        { name: 'build', type: 'build', run: 'docker build -t api-service:$COMMIT_SHA .', dependsOn: ['test'] },
        { name: 'scan', type: 'scan', dependsOn: ['build'] },
        { name: 'deploy-staging', type: 'deploy', environment: 'staging', dependsOn: ['scan'] },
        { name: 'deploy-prod', type: 'deploy', environment: 'production', dependsOn: ['deploy-staging'] },
      ],
      environments: ['staging', 'production'], enabled: true,
      createdAt: ago(10000), updatedAt: ago(60),
      lastRunId: 'run1', lastRunStatus: 'success', lastRunAt: ago(12),
      _demo: true,
    },
    {
      id: 'p2', name: 'web-frontend CI', repoId: 'r2', repoFullName: 'acme/web-frontend',
      branch: 'main', triggerOn: ['push', 'pull_request'],
      stages: [
        { name: 'lint', type: 'run', run: 'npm run lint' },
        { name: 'test', type: 'test', run: 'npm test', parallel: true },
        { name: 'build', type: 'build', run: 'npm run build', dependsOn: ['test', 'lint'] },
        { name: 'deploy-staging', type: 'deploy', environment: 'staging', dependsOn: ['build'] },
      ],
      environments: ['staging'], enabled: true,
      createdAt: ago(9000), updatedAt: ago(45),
      lastRunId: 'run2', lastRunStatus: 'failed', lastRunAt: ago(45),
      _demo: true,
    },
    {
      id: 'p3', name: 'ml-pipeline nightly', repoId: 'r3', repoFullName: 'acme/ml-pipeline',
      branch: 'main', triggerOn: ['schedule'],
      schedule: '0 2 * * *',
      stages: [
        { name: 'data-prep', type: 'run', run: 'python data_prep.py' },
        { name: 'train', type: 'run', run: 'python train.py', timeoutMinutes: 120, dependsOn: ['data-prep'] },
        { name: 'evaluate', type: 'run', run: 'python evaluate.py', dependsOn: ['train'] },
        { name: 'publish', type: 'run', run: 'python publish_model.py', dependsOn: ['evaluate'] },
      ],
      environments: [], enabled: true,
      createdAt: ago(8000), updatedAt: ago(180),
      lastRunId: 'run3', lastRunStatus: 'success', lastRunAt: ago(180),
      _demo: true,
    },
    {
      id: 'p4', name: 'auth-service CI/CD', repoId: 'r4', repoFullName: 'acme/auth-service',
      branch: 'main', triggerOn: ['push'],
      stages: [
        { name: 'test', type: 'test', run: 'go test ./...', timeoutMinutes: 15 },
        { name: 'build', type: 'build', run: 'docker build -t auth-service:$COMMIT_SHA .', dependsOn: ['test'] },
        { name: 'scan', type: 'scan', dependsOn: ['build'] },
        { name: 'deploy-prod', type: 'deploy', environment: 'production', dependsOn: ['scan'] },
      ],
      environments: ['production'], enabled: true,
      createdAt: ago(7000), updatedAt: ago(360),
      lastRunId: 'run4', lastRunStatus: 'success', lastRunAt: ago(360),
      _demo: true,
    },
  ]
  write('pipelines.json', pipelines)

  // ─── Runs ─────────────────────────────────────────────────────────────────
  const runs: PipelineRun[] = [
    {
      id: 'run1', pipelineId: 'p1', pipelineName: 'api-service CI/CD',
      repoFullName: 'acme/api-service', branch: 'main',
      commit: 'a1b2c3d4e5f6', commitMessage: 'feat: add rate limiting middleware',
      author: 'Alice Chen', authorEmail: 'alice@acme.com', trigger: 'push',
      status: 'success', environment: 'production',
      stages: [
        { name: 'test', status: 'success', startedAt: ago(22), finishedAt: ago(17), durationMs: 300000, exitCode: 0, logs: ['Running 247 tests...', 'All tests passed.'], retries: 0 },
        { name: 'build', status: 'success', startedAt: ago(17), finishedAt: ago(14), durationMs: 180000, exitCode: 0, logs: ['Building Docker image...', 'Image built: api-service:a1b2c3d'], retries: 0 },
        { name: 'scan', status: 'success', startedAt: ago(14), finishedAt: ago(13), durationMs: 60000, exitCode: 0, logs: ['Scanning image for CVEs...', 'No CRITICAL vulnerabilities found.'], retries: 0 },
        { name: 'deploy-staging', status: 'success', startedAt: ago(13), finishedAt: ago(13), durationMs: 45000, exitCode: 0, logs: ['Deploying to staging...', 'Health gate passed.'], retries: 0 },
        { name: 'deploy-prod', status: 'success', startedAt: ago(13), finishedAt: ago(12), durationMs: 60000, exitCode: 0, logs: ['Deploying to production...', 'Rollout complete. 3/3 pods ready.'], retries: 0 },
      ],
      startedAt: ago(22), finishedAt: ago(12), durationMs: 630000,
      _demo: true,
    },
    {
      id: 'run2', pipelineId: 'p2', pipelineName: 'web-frontend CI',
      repoFullName: 'acme/web-frontend', branch: 'feature/new-dashboard',
      commit: 'f9e8d7c6b5a4', commitMessage: 'refactor: update dashboard layout',
      author: 'Bob Kim', authorEmail: 'bob@acme.com', trigger: 'pull_request',
      status: 'failed', environment: 'staging',
      stages: [
        { name: 'lint', status: 'success', startedAt: ago(50), finishedAt: ago(49), durationMs: 30000, exitCode: 0, logs: ['ESLint check passed.'], retries: 0 },
        { name: 'test', status: 'failed', startedAt: ago(49), finishedAt: ago(47), durationMs: 120000, exitCode: 1, logs: ['Running 89 tests...', 'FAIL src/components/Dashboard.test.tsx', '  ● Dashboard › renders correctly', '    Expected: "Dashboard" but received: "DashboardV2"'], retries: 1 },
        { name: 'build', status: 'skipped', startedAt: ago(47), durationMs: 0, logs: ['Skipped due to upstream failure.'], retries: 0 },
        { name: 'deploy-staging', status: 'skipped', durationMs: 0, logs: [], retries: 0 },
      ],
      startedAt: ago(50), finishedAt: ago(47), durationMs: 180000,
      error: 'Test stage failed: 3 tests failed in Dashboard component',
      _demo: true,
    },
    {
      id: 'run3', pipelineId: 'p3', pipelineName: 'ml-pipeline nightly',
      repoFullName: 'acme/ml-pipeline', branch: 'main',
      commit: '1a2b3c4d5e6f', commitMessage: 'chore: update training config',
      author: 'Scheduled', authorEmail: 'ci@vyncicd.local', trigger: 'schedule',
      status: 'success',
      stages: [
        { name: 'data-prep', status: 'success', startedAt: ago(190), finishedAt: ago(185), durationMs: 300000, exitCode: 0, logs: ['Downloading 12GB training dataset...', 'Preprocessing complete.'], retries: 0 },
        { name: 'train', status: 'success', startedAt: ago(185), finishedAt: ago(185), durationMs: 3600000, exitCode: 0, logs: ['Training epoch 1/50...', 'Training complete. Accuracy: 94.2%'], retries: 0 },
        { name: 'evaluate', status: 'success', startedAt: ago(185), finishedAt: ago(183), durationMs: 120000, exitCode: 0, logs: ['Evaluation passed. F1: 0.941'], retries: 0 },
        { name: 'publish', status: 'success', startedAt: ago(183), finishedAt: ago(180), durationMs: 180000, exitCode: 0, logs: ['Model published to registry: ml-model:v2.3'], retries: 0 },
      ],
      startedAt: ago(190), finishedAt: ago(180), durationMs: 600000,
      _demo: true,
    },
    {
      id: 'run4', pipelineId: 'p4', pipelineName: 'auth-service CI/CD',
      repoFullName: 'acme/auth-service', branch: 'main',
      commit: '7g8h9i0j1k2l', commitMessage: 'fix: JWT expiry validation',
      author: 'Carlos Davis', authorEmail: 'carlos@acme.com', trigger: 'push',
      status: 'success', environment: 'production',
      stages: [
        { name: 'test', status: 'success', startedAt: ago(375), finishedAt: ago(365), durationMs: 600000, exitCode: 0, logs: ['go test ./... ok (152 tests)'], retries: 0 },
        { name: 'build', status: 'success', startedAt: ago(365), finishedAt: ago(362), durationMs: 180000, exitCode: 0, logs: ['auth-service:7g8h9i0 built'], retries: 0 },
        { name: 'scan', status: 'success', startedAt: ago(362), finishedAt: ago(361), durationMs: 60000, exitCode: 0, logs: ['0 critical, 2 medium CVEs found (not blocking).'], retries: 0 },
        { name: 'deploy-prod', status: 'success', startedAt: ago(361), finishedAt: ago(360), durationMs: 60000, exitCode: 0, logs: ['Deployed to production. Pods: 2/2 ready.'], retries: 0 },
      ],
      startedAt: ago(375), finishedAt: ago(360), durationMs: 900000,
      _demo: true,
    },
    {
      id: 'run5', pipelineId: 'p1', pipelineName: 'api-service CI/CD',
      repoFullName: 'acme/api-service', branch: 'hotfix/auth-bypass',
      commit: 'c3d4e5f6a7b8', commitMessage: 'hotfix: patch auth bypass vulnerability',
      author: 'Alice Chen', authorEmail: 'alice@acme.com', trigger: 'push',
      status: 'success', environment: 'production',
      stages: [
        { name: 'test', status: 'success', startedAt: ago(1500), finishedAt: ago(1495), durationMs: 300000, exitCode: 0, logs: ['All tests passed.'], retries: 0 },
        { name: 'build', status: 'success', startedAt: ago(1495), finishedAt: ago(1493), durationMs: 120000, exitCode: 0, logs: ['Image built.'], retries: 0 },
        { name: 'scan', status: 'success', startedAt: ago(1493), finishedAt: ago(1492), durationMs: 60000, exitCode: 0, logs: ['Scan passed.'], retries: 0 },
        { name: 'deploy-staging', status: 'success', startedAt: ago(1492), finishedAt: ago(1491), durationMs: 45000, exitCode: 0, logs: ['Staging deploy OK.'], retries: 0 },
        { name: 'deploy-prod', status: 'success', startedAt: ago(1491), finishedAt: ago(1490), durationMs: 60000, exitCode: 0, logs: ['Production deploy OK.'], retries: 0 },
      ],
      startedAt: ago(1500), finishedAt: ago(1490), durationMs: 585000,
      _demo: true,
    },
  ]
  write('runs.json', runs)

  // ─── Deployments ──────────────────────────────────────────────────────────
  const deployments: Deployment[] = [
    { id: 'd1', runId: 'run1', pipelineName: 'api-service CI/CD', repoFullName: 'acme/api-service', environment: 'production', version: 'v2.4.1', commit: 'a1b2c3d', author: 'Alice Chen', status: 'healthy', healthGatePassed: true, rolledBack: false, deployedAt: ago(22), finishedAt: ago(12), durationMs: 630000, k8sNamespace: 'prod', image: 'api-service:a1b2c3d', _demo: true },
    { id: 'd2', runId: 'run4', pipelineName: 'auth-service CI/CD', repoFullName: 'acme/auth-service', environment: 'production', version: 'v1.8.3', commit: '7g8h9i0', author: 'Carlos Davis', status: 'healthy', healthGatePassed: true, rolledBack: false, deployedAt: ago(375), finishedAt: ago(360), durationMs: 900000, k8sNamespace: 'prod', image: 'auth-service:7g8h9i0', _demo: true },
    { id: 'd3', runId: 'run5', pipelineName: 'api-service CI/CD', repoFullName: 'acme/api-service', environment: 'production', version: 'v2.4.0', commit: 'c3d4e5f', author: 'Alice Chen', status: 'healthy', healthGatePassed: true, rolledBack: false, deployedAt: ago(1500), finishedAt: ago(1490), durationMs: 585000, k8sNamespace: 'prod', image: 'api-service:c3d4e5f', _demo: true },
    { id: 'd4', runId: 'run1', pipelineName: 'api-service CI/CD', repoFullName: 'acme/api-service', environment: 'staging', version: 'v2.4.1-staging', commit: 'a1b2c3d', author: 'Alice Chen', status: 'healthy', healthGatePassed: true, rolledBack: false, deployedAt: ago(13), finishedAt: ago(13), durationMs: 45000, k8sNamespace: 'staging', image: 'api-service:a1b2c3d', _demo: true },
  ]
  write('deployments.json', deployments)

  // ─── Security Scans ───────────────────────────────────────────────────────
  const scans: SecurityScan[] = [
    {
      id: 's1', runId: 'run1', repoFullName: 'acme/api-service',
      image: 'api-service:a1b2c3d', scanType: 'container', status: 'passed',
      vulnerabilities: [
        { id: 'v1', packageName: 'express', installedVersion: '4.18.1', fixedVersion: '4.19.2', severity: 'medium', cvss: 5.3, description: 'ReDoS in express router', cveId: 'CVE-2024-29041' },
        { id: 'v2', packageName: 'axios', installedVersion: '0.27.0', fixedVersion: '1.6.0', severity: 'high', cvss: 7.5, description: 'SSRF via URL redirect', cveId: 'CVE-2023-45857' },
      ],
      secretsFound: 0, scannedAt: ago(14), blockedBuild: false,
      _demo: true,
    },
    {
      id: 's2', runId: 'run4', repoFullName: 'acme/auth-service',
      image: 'auth-service:7g8h9i0', scanType: 'container', status: 'warning',
      vulnerabilities: [
        { id: 'v3', packageName: 'golang.org/x/net', installedVersion: 'v0.7.0', fixedVersion: 'v0.17.0', severity: 'medium', cvss: 5.9, description: 'HTTP/2 rapid reset attack', cveId: 'CVE-2023-44487' },
        { id: 'v4', packageName: 'github.com/dgrijalva/jwt-go', installedVersion: 'v3.2.0', fixedVersion: 'v4.0.0', severity: 'high', cvss: 7.5, description: 'JWT key confusion attack', cveId: 'CVE-2020-26160' },
      ],
      secretsFound: 0, scannedAt: ago(362), blockedBuild: false,
      _demo: true,
    },
    {
      id: 's3', runId: 'run2', repoFullName: 'acme/web-frontend',
      scanType: 'secret', status: 'passed',
      vulnerabilities: [],
      secretsFound: 0, scannedAt: ago(48), blockedBuild: false,
      _demo: true,
    },
  ]
  write('scans.json', scans)

  // ─── Incidents ────────────────────────────────────────────────────────────
  const incidents: Incident[] = [
    {
      id: crypto.randomUUID(), title: 'Build failure: web-frontend test suite (Dashboard component)',
      severity: 'high', status: 'open', category: 'build-failure',
      source: 'web-frontend CI', runId: 'run2', repo: 'acme/web-frontend',
      branch: 'feature/new-dashboard', commit: 'f9e8d7c6b5a4', author: 'Bob Kim',
      createdAt: ago(45), updatedAt: ago(45),
      notes: 'Failing in Dashboard.test.tsx — assertion mismatch after layout refactor.',
      _demo: true,
    },
  ]
  write('incidents.json', incidents)
}
