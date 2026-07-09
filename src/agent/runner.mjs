#!/usr/bin/env node
/**
 * VynCICD Runner Agent
 *
 * Standalone Node.js process that:
 *  1. Polls /api/runs?status=pending every POLL_INTERVAL_MS
 *  2. Claims a run by immediately patching it to 'running'
 *  3. Executes each stage in sequence using Docker or shell
 *  4. Reports stage status + logs back via /api/runs/:id/stage and /api/runs/:id/logs
 *  5. Supports stage types: run, build, scan (Trivy), deploy (kubectl)
 *
 * Usage: node runner.mjs
 * Env vars (all have defaults):
 *   VYNCICD_URL           — base URL of the app (default: http://localhost:3050)
 *   RUNNER_SECRET         — must match RUNNER_SECRET / VYNCICD_SECRET on server
 *   POLL_INTERVAL_MS      — poll frequency (default: 5000)
 *   KUBECONFIG            — path to kubeconfig (default: /home/labcicd/kubeconfig/cicd.yaml)
 *   REGISTRY_URL          — Docker registry (default: localhost:5050)
 *   RUNNER_WORKSPACE      — temp build dir (default: /tmp/vyncicd-runner)
 *   MAX_STAGE_TIMEOUT_MS  — stage timeout (default: 300000 = 5 min)
 */

import { execFile, spawn } from 'node:child_process'
import { promisify } from 'node:util'
import { mkdirSync, rmSync, existsSync } from 'node:fs'
import path from 'node:path'
import os from 'node:os'

const execFileAsync = promisify(execFile)

const BASE_URL          = process.env.VYNCICD_URL          ?? 'http://localhost:3050'
const RUNNER_SECRET     = process.env.RUNNER_SECRET        ?? process.env.VYNCICD_SECRET ?? ''
const POLL_INTERVAL_MS  = Number(process.env.POLL_INTERVAL_MS ?? '5000')
const KUBECONFIG        = process.env.KUBECONFIG           ?? '/home/labcicd/kubeconfig/cicd.yaml'
const REGISTRY_URL      = process.env.REGISTRY_URL         ?? 'localhost:5050'
const WORKSPACE         = process.env.RUNNER_WORKSPACE     ?? '/tmp/vyncicd-runner'
const MAX_STAGE_MS      = Number(process.env.MAX_STAGE_TIMEOUT_MS ?? '300000')

// Ensure workspace dir
mkdirSync(WORKSPACE, { recursive: true })

const HEADERS = {
  'Content-Type': 'application/json',
  'x-runner-token': RUNNER_SECRET,
}

// Track which run IDs are currently being processed (prevent double-claiming)
const inFlight = new Set()

// ── API helpers ───────────────────────────────────────────────────────────────

async function apiFetch(path, opts = {}) {
  const url = `${BASE_URL}${path}`
  const res = await fetch(url, { ...opts, headers: { ...HEADERS, ...(opts.headers ?? {}) } })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`API ${opts.method ?? 'GET'} ${path} → ${res.status}: ${text}`)
  }
  return res.json()
}

async function patchRun(id, patch) {
  return apiFetch(`/api/runs/${id}`, { method: 'PATCH', body: JSON.stringify(patch) })
}

async function reportStage(runId, stageName, update) {
  return apiFetch(`/api/runs/${runId}/stage`, { method: 'POST', body: JSON.stringify({ stage: stageName, ...update }) })
}

async function pushLogs(runId, stageName, lines) {
  if (!lines.length) return
  return apiFetch(`/api/runs/${runId}/logs`, { method: 'POST', body: JSON.stringify({ stage: stageName, lines }) })
}

// ── CI env vars & template resolution ────────────────────────────────────────

/**
 * Build the CI environment variables for a given run.
 * These are injected into every shell stage command.
 */
function ciEnv(run) {
  const repoSlug = run.repoFullName.replace('/', '-')
  const image = `${REGISTRY_URL}/${run.repoFullName}:${run.commit}`
  // For K8s manifest: use the registry's internal Docker-network name
  // k3d creates the registry as cicd-registry (accessible inside cluster as cicd-registry:5000)
  const K8S_REGISTRY = process.env.K8S_REGISTRY_URL ?? 'cicd-registry:5000'
  const k8sImage = `${K8S_REGISTRY}/${run.repoFullName}:${run.commit}`
  return {
    ...process.env,
    CI: 'true',
    COMMIT: run.commit,
    BRANCH: run.branch,
    REPO_FULL: run.repoFullName,
    REPO_SLUG: repoSlug,
    REGISTRY: REGISTRY_URL,
    IMAGE: image,
    K8S_IMAGE: k8sImage,
    KUBECONFIG,
  }
}

/**
 * Resolve ${VAR} template tokens in a string using the ciEnv map.
 */
function resolveTemplate(str, env) {
  return str.replace(/\$\{([^}]+)\}/g, (_, key) => env[key] ?? `\${${key}}`)
}

// ── Stage executors ───────────────────────────────────────────────────────────

/**
 * Run a shell command, stream stdout/stderr back as log lines.
 * Returns { exitCode, durationMs }.
 */
function runCommand(cmd, args, opts, onLines) {
  return new Promise((resolve) => {
    const start = Date.now()
    const child = spawn(cmd, args, { shell: false, ...opts })

    function onData(data) {
      const text = data.toString()
      const batch = text.split('\n').filter(l => l.length > 0)
      onLines(batch)
    }

    child.stdout?.on('data', onData)
    child.stderr?.on('data', onData)

    const timer = setTimeout(() => {
      child.kill('SIGKILL')
      onLines(['[runner] stage timed out after ' + MAX_STAGE_MS + 'ms'])
    }, MAX_STAGE_MS)

    child.on('close', (code) => {
      clearTimeout(timer)
      resolve({ exitCode: code ?? 1, durationMs: Date.now() - start })
    })

    child.on('error', (err) => {
      clearTimeout(timer)
      onLines([`[runner] spawn error: ${err.message}`])
      resolve({ exitCode: 1, durationMs: Date.now() - start })
    })
  })
}

async function executeStage(run, stage, workDir) {
  const { name, type } = stage
  const runId = run.id
  const startedAt = new Date().toISOString()
  const logBuffer = []
  let flushTimer
  const env = ciEnv(run)

  async function flush() {
    if (!logBuffer.length) return
    const batch = logBuffer.splice(0)
    await pushLogs(runId, name, batch).catch(e => console.error(`[runner] log push error: ${e.message}`))
  }

  function onLines(lines) {
    logBuffer.push(...lines)
    lines.forEach(l => console.log(`  [${name}] ${l}`))
    if (!flushTimer) flushTimer = setInterval(() => flush(), 2000)
  }

  await reportStage(runId, name, { status: 'running', startedAt })
  console.log(`[runner] stage=${name} type=${type} starting`)

  let exitCode = 0
  let durationMs = 0

  try {
    if (type === 'run' || type === 'test' || type === 'build') {
      const shellCmd = stage.run ?? `echo "no run command for ${name}"`
      const result = await runCommand('bash', ['-c', shellCmd], { cwd: workDir, env }, onLines)
      exitCode = result.exitCode
      durationMs = result.durationMs

    } else if (type === 'scan') {
      // Resolve image template — defaults to the built image for this run
      const rawImage = stage.image ?? '${IMAGE}'
      const image = resolveTemplate(rawImage, env)
      onLines([`[trivy] scanning image: ${image}`])
      const result = await runCommand(
        'docker',
        ['run', '--rm', '-v', '/var/run/docker.sock:/var/run/docker.sock',
         'aquasec/trivy:latest', 'image', '--exit-code', '0',
         '--severity', 'CRITICAL,HIGH', '--format', 'table', image],
        { cwd: workDir, env },
        onLines
      )
      exitCode = result.exitCode
      durationMs = result.durationMs

    } else if (type === 'deploy') {
      const stageEnv = stage.environment ?? run.environment ?? 'dev'
      const namespace = stageEnv === 'production' ? 'production' : stageEnv === 'staging' ? 'staging' : 'dev'
      const rawManifest = stage.manifest ?? stage.run
      if (!rawManifest) {
        onLines(['[runner] no manifest or run command for deploy stage'])
        exitCode = 1
      } else {
        // Resolve ${K8S_IMAGE}, ${COMMIT}, etc. in the manifest
        const manifest = resolveTemplate(rawManifest, env)
        const manifestPath = path.join(workDir, `${name}.yaml`)
        const { writeFileSync } = await import('node:fs')
        writeFileSync(manifestPath, manifest, 'utf8')
        onLines([`[kubectl] applying manifest to namespace=${namespace}`])
        const result = await runCommand(
          'kubectl',
          ['--kubeconfig', KUBECONFIG, '-n', namespace, 'apply', '-f', manifestPath],
          { cwd: workDir, env },
          onLines
        )
        exitCode = result.exitCode
        durationMs = result.durationMs
      }

    } else if (type === 'notify') {
      onLines([`[notify] stage type "notify" — notification sent (stub)`])
      exitCode = 0

    } else if (type === 'manual') {
      onLines([`[manual] manual approval gates not yet wired — passing through`])
      exitCode = 0

    } else {
      onLines([`[runner] unknown stage type "${type}", skipping`])
      exitCode = 0
    }

  } catch (err) {
    onLines([`[runner] stage error: ${err.message}`])
    exitCode = 1
  }

  clearInterval(flushTimer)
  await flush()

  const finishedAt = new Date().toISOString()
  const status = exitCode === 0 ? 'success' : (stage.allowFailure ? 'skipped' : 'failed')

  await reportStage(runId, name, {
    status,
    finishedAt,
    durationMs,
    exitCode,
  })

  console.log(`[runner] stage=${name} status=${status} exitCode=${exitCode} duration=${durationMs}ms`)
  return { status, exitCode }
}

// ── Clone or update repo ──────────────────────────────────────────────────────

async function prepareWorkdir(run) {
  const safeId = run.id.replace(/[^a-z0-9-]/gi, '')
  const workDir = path.join(WORKSPACE, safeId)

  const GITEA_URL = process.env.GITEA_URL ?? 'http://localhost:10080'
  const GITEA_TOKEN = process.env.GITEA_TOKEN ?? ''
  const repoUrl = GITEA_TOKEN
    ? GITEA_URL.replace('://', `://oauth2:${GITEA_TOKEN}@`) + `/${run.repoFullName}.git`
    : `${GITEA_URL}/${run.repoFullName}.git`

  if (existsSync(workDir)) rmSync(workDir, { recursive: true, force: true })
  mkdirSync(workDir, { recursive: true })

  console.log(`[runner] cloning ${run.repoFullName} branch=${run.branch}`)
  try {
    await execFileAsync('git', [
      'clone', '--depth=1', '--branch', run.branch, repoUrl, workDir
    ], { timeout: 60000 })
    console.log(`[runner] clone ok → ${workDir}`)
  } catch (err) {
    console.warn(`[runner] clone failed: ${err.message} — running stages without repo`)
  }

  return workDir
}

// ── Run processor ─────────────────────────────────────────────────────────────

async function processRun(run) {
  if (inFlight.has(run.id)) return
  inFlight.add(run.id)

  console.log(`\n[runner] ▶ claiming run ${run.id} (${run.pipelineName}) branch=${run.branch} commit=${run.commit}`)

  try {
    // Claim the run
    await patchRun(run.id, { status: 'running' })

    const workDir = await prepareWorkdir(run)

    for (const stage of run.stages) {
      if (stage.status === 'success' || stage.status === 'skipped') continue

      const result = await executeStage(run, stage, workDir)

      // Stop pipeline on failure (unless allowFailure)
      if (result.status === 'failed') {
        // Mark remaining stages as skipped
        const remainingIdx = run.stages.indexOf(stage) + 1
        for (let i = remainingIdx; i < run.stages.length; i++) {
          await reportStage(run.id, run.stages[i].name, {
            status: 'skipped',
            finishedAt: new Date().toISOString(),
          })
        }
        await patchRun(run.id, {
          status: 'failed',
          error: `Stage "${stage.name}" failed with exit code ${result.exitCode}`,
          finishedAt: new Date().toISOString(),
        })
        // Cleanup
        rmSync(workDir, { recursive: true, force: true })
        return
      }
    }

    await patchRun(run.id, { status: 'success', finishedAt: new Date().toISOString() })
    console.log(`[runner] ✓ run ${run.id} succeeded`)

    // Cleanup workdir
    rmSync(workDir, { recursive: true, force: true })

  } catch (err) {
    console.error(`[runner] ✗ run ${run.id} error: ${err.message}`)
    await patchRun(run.id, {
      status: 'failed',
      error: err.message,
      finishedAt: new Date().toISOString(),
    }).catch(() => {})
  } finally {
    inFlight.delete(run.id)
  }
}

// ── Main poll loop ────────────────────────────────────────────────────────────

async function poll() {
  try {
    const runs = await apiFetch(`/api/runs?status=pending&limit=5`)
    for (const run of runs) {
      // Fire and forget — each run processed concurrently
      processRun(run).catch(err => console.error(`[runner] unhandled: ${err.message}`))
    }
  } catch (err) {
    console.error(`[runner] poll error: ${err.message}`)
  }
}

console.log(`[runner] VynCICD Runner Agent starting`)
console.log(`[runner]   BASE_URL:      ${BASE_URL}`)
console.log(`[runner]   POLL_INTERVAL: ${POLL_INTERVAL_MS}ms`)
console.log(`[runner]   KUBECONFIG:    ${KUBECONFIG}`)
console.log(`[runner]   WORKSPACE:     ${WORKSPACE}`)
console.log(`[runner]   REGISTRY_URL:  ${REGISTRY_URL}`)

// Initial poll immediately, then on interval
poll()
setInterval(poll, POLL_INTERVAL_MS)
