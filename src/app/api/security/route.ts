import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth'
import { loadRuns, loadScans, saveScans } from '@/lib/data-store'
import type { SecurityScan, SecretFinding, Vulnerability, VulnSeverity } from '@/lib/data-store'
import crypto from 'crypto'

const RUNNER_SECRET = process.env.RUNNER_SECRET ?? process.env.VYNCICD_SECRET ?? ''
function authRunner(req: NextRequest): boolean {
  const token = req.headers.get('x-runner-token') ?? ''
  return Boolean(RUNNER_SECRET) && token === RUNNER_SECRET
}

function isObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

function isSeverity(value: unknown): value is VulnSeverity {
  return value === 'critical' || value === 'high' || value === 'medium' || value === 'low' || value === 'informational'
}

function isScanType(value: unknown): value is SecurityScan['scanType'] {
  return value === 'container' || value === 'secret' || value === 'sast' || value === 'dast' || value === 'sbom'
}

function isStatus(value: unknown): value is SecurityScan['status'] {
  return value === 'passed' || value === 'failed' || value === 'warning' || value === 'skipped' || value === 'error'
}

export async function GET(req: NextRequest) {
  const auth = await requireRole(req, 'viewer')
  if (auth instanceof NextResponse) return auth
  return NextResponse.json(loadScans())
}

export async function POST(req: NextRequest) {
  if (!authRunner(req)) {
    const auth = await requireRole(req, 'admin')
    if (auth instanceof NextResponse) return auth
  }
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON scan report.' }, { status: 400 })
  }
  if (!isObject(body) || typeof body.runId !== 'string' || typeof body.repoFullName !== 'string'
    || !isScanType(body.scanType) || !isStatus(body.status) || !Array.isArray(body.vulnerabilities)
    || typeof body.secretsFound !== 'number' || !Number.isSafeInteger(body.secretsFound) || body.secretsFound < 0
    || typeof body.blockedBuild !== 'boolean'
    || typeof body.scannedAt !== 'string' || !Number.isFinite(Date.parse(body.scannedAt))
    || (body.stageName !== undefined && (typeof body.stageName !== 'string' || !body.stageName))
    || (body.image !== undefined && typeof body.image !== 'string')
    || (body.sbomArtifactUrl !== undefined && typeof body.sbomArtifactUrl !== 'string')
    || (body.status === 'error' && (typeof body.error !== 'string' || !body.error))
  ) {
    return NextResponse.json({ error: 'Invalid scan report fields.' }, { status: 400 })
  }
  const run = loadRuns().find(item => item.id === body.runId)
  if (!run) return NextResponse.json({ error: 'Referenced pipeline run not found.' }, { status: 404 })
  if (run.repoFullName !== body.repoFullName) {
    return NextResponse.json({ error: 'Scan repository does not match the pipeline run.' }, { status: 400 })
  }
  const stage = body.stageName === undefined ? undefined : run.stages.find(item => item.name === body.stageName)
  if (body.stageName !== undefined && (!stage || (stage.type !== undefined && stage.type !== 'scan'))) {
    return NextResponse.json({ error: 'Referenced scan stage not found.' }, { status: 400 })
  }
  const vulnerabilities: Vulnerability[] = []
  for (const finding of body.vulnerabilities) {
    if (!isObject(finding) || typeof finding.id !== 'string' || typeof finding.packageName !== 'string'
      || typeof finding.installedVersion !== 'string' || typeof finding.description !== 'string'
      || !isSeverity(finding.severity)
      || (finding.fixedVersion !== undefined && typeof finding.fixedVersion !== 'string')
      || (finding.cveId !== undefined && typeof finding.cveId !== 'string')
      || (finding.cvss !== undefined && (typeof finding.cvss !== 'number' || !Number.isFinite(finding.cvss)))
    ) return NextResponse.json({ error: 'Invalid vulnerability finding.' }, { status: 400 })
    vulnerabilities.push({
      id: finding.id, packageName: finding.packageName, installedVersion: finding.installedVersion,
      description: finding.description, severity: finding.severity,
      fixedVersion: typeof finding.fixedVersion === 'string' ? finding.fixedVersion : undefined,
      cveId: typeof finding.cveId === 'string' ? finding.cveId : undefined,
      cvss: typeof finding.cvss === 'number' ? finding.cvss : undefined,
    })
  }
  let secretFindings: SecretFinding[] | undefined
  if (body.secretFindings !== undefined) {
    if (!Array.isArray(body.secretFindings) || body.secretFindings.length !== body.secretsFound) {
      return NextResponse.json({ error: 'Invalid secret finding count.' }, { status: 400 })
    }
    secretFindings = []
    for (const finding of body.secretFindings) {
      if (!isObject(finding) || typeof finding.id !== 'string' || typeof finding.filePath !== 'string'
        || typeof finding.ruleId !== 'string' || typeof finding.title !== 'string' || !isSeverity(finding.severity)
        || (finding.startLine !== undefined && (typeof finding.startLine !== 'number'
          || !Number.isSafeInteger(finding.startLine) || finding.startLine < 1))
      ) return NextResponse.json({ error: 'Invalid secret finding.' }, { status: 400 })
      secretFindings.push({
        id: finding.id, filePath: finding.filePath, ruleId: finding.ruleId,
        title: finding.title, severity: finding.severity,
        startLine: typeof finding.startLine === 'number' ? finding.startLine : undefined,
      })
    }
  }
  const scans = loadScans()
  const previous = body.stageName === undefined ? undefined : scans.find(item =>
    item.runId === body.runId && item.stageName === body.stageName && item.scanType === body.scanType
  )
  const scan: SecurityScan = {
    id: previous?.id ?? crypto.randomUUID(), runId: run.id, repoFullName: run.repoFullName,
    pipelineId: run.pipelineId, pipelineName: run.pipelineName,
    stageName: typeof body.stageName === 'string' ? body.stageName : undefined,
    image: typeof body.image === 'string' ? body.image : undefined,
    sbomArtifactUrl: typeof body.sbomArtifactUrl === 'string' ? body.sbomArtifactUrl : undefined,
    scanType: body.scanType, status: body.status, scannedAt: body.scannedAt,
    vulnerabilities, secretsFound: body.secretsFound, secretFindings,
    blockedBuild: body.blockedBuild && !stage?.allowFailure,
    error: body.status === 'error' && typeof body.error === 'string' ? body.error : undefined,
  }
  saveScans([scan, ...scans.filter(item => item.id !== scan.id)].slice(0, 200))
  return NextResponse.json(scan, { status: previous ? 200 : 201 })
}
