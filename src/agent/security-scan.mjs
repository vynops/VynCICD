import { randomUUID } from 'node:crypto'
import { readFileSync, rmSync, existsSync } from 'node:fs'
import path from 'node:path'

const isObject = value => value !== null && typeof value === 'object' && !Array.isArray(value)
const severity = value => {
  if (typeof value !== 'string') throw new Error('Invalid scanner severity')
  const normalized = value.toLowerCase()
  if (['critical', 'high', 'medium', 'low'].includes(normalized)) return normalized
  if (normalized === 'unknown' || normalized === 'informational') return 'informational'
  throw new Error('Invalid scanner severity')
}

export function parseTrivyReport(report, scanType) {
  if (scanType !== 'container' && scanType !== 'secret') throw new Error('Unsupported scanner report type')
  if (!isObject(report)) throw new Error('Invalid scanner report')
  const emptyReport = report.Results === undefined && report.SchemaVersion === 2
    && typeof report.ArtifactName === 'string' && report.ArtifactName.length > 0
    && typeof report.ArtifactType === 'string' && report.ArtifactType.length > 0
  if (!emptyReport && !Array.isArray(report.Results)) throw new Error('Invalid scanner report')
  const vulnerabilities = []
  const secretFindings = []
  for (const result of emptyReport ? [] : report.Results) {
    if (!isObject(result)) throw new Error('Invalid scanner result')
    const findings = scanType === 'container' ? result.Vulnerabilities : result.Secrets
    if (findings === undefined || findings === null) continue
    if (!Array.isArray(findings)) throw new Error('Invalid scanner findings')
    for (const finding of findings) {
      if (!isObject(finding)) throw new Error('Invalid scanner finding')
      if (scanType === 'container') {
        if (typeof finding.PkgName !== 'string' || typeof finding.InstalledVersion !== 'string'
          || typeof finding.VulnerabilityID !== 'string') throw new Error('Invalid vulnerability finding')
        vulnerabilities.push({
          id: randomUUID(), packageName: finding.PkgName, installedVersion: finding.InstalledVersion,
          fixedVersion: typeof finding.FixedVersion === 'string' && finding.FixedVersion ? finding.FixedVersion : undefined,
          severity: severity(finding.Severity),
          description: typeof finding.Title === 'string' ? finding.Title : finding.VulnerabilityID,
          cveId: /^CVE-\d{4}-\d+$/.test(finding.VulnerabilityID) ? finding.VulnerabilityID : undefined,
        })
      } else {
        if (typeof result.Target !== 'string' || typeof finding.RuleID !== 'string'
          || typeof finding.Title !== 'string') throw new Error('Invalid secret finding')
        secretFindings.push({
          id: randomUUID(), filePath: result.Target.replace(/^\/workspace\//, ''), ruleId: finding.RuleID,
          title: finding.Title, severity: severity(finding.Severity),
          startLine: Number.isSafeInteger(finding.StartLine) && finding.StartLine > 0 ? finding.StartLine : undefined,
        })
      }
    }
  }
  return { vulnerabilities, secretFindings, secretsFound: secretFindings.length }
}

export async function executeSecurityScans({
  run, stage, workDir, settings, env, timeoutMs, runCommand, reportScan, onLines,
}) {
  const base = {
    runId: run.id, repoFullName: run.repoFullName, stageName: stage.name,
    vulnerabilities: [], secretsFound: 0, secretFindings: [], blockedBuild: false,
  }
  let exitCode = 0
  let durationMs = 0
  let completed = 0
  const image = (stage.image ?? env.IMAGE).replace(/\$\{([^}]+)\}/g, (match, key) => env[key] ?? match)

  for (const scanType of ['container', 'secret']) {
    const enabled = settings.trivyEnabled && (scanType !== 'secret' || settings.secretScanEnabled)
    if (!enabled) {
      onLines([`[trivy] ${scanType} scanning disabled in Settings`])
      await reportScan({ ...base, scanType, image: scanType === 'container' ? image : undefined,
        status: 'skipped', scannedAt: new Date().toISOString() })
      continue
    }
    const filename = `security-${randomUUID()}.json`
    const reportPath = path.join(workDir, filename)
    let scan
    let failed = false
    try {
      const args = ['run', '--rm', '-v', `${workDir}:/workspace`]
      if (scanType === 'container') args.push('-v', '/var/run/docker.sock:/var/run/docker.sock')
      args.push('aquasec/trivy:latest', scanType === 'container' ? 'image' : 'fs',
        '--scanners', scanType === 'container' ? 'vuln' : 'secret',
        '--exit-code', '0', '--format', 'json', '--output', `/workspace/${filename}`,
        scanType === 'container' ? image : '/workspace')
      const result = await runCommand('docker', args, { cwd: workDir, env }, onLines, timeoutMs)
      durationMs += result.durationMs
      if (result.exitCode !== 0) throw new Error('Scanner execution failed')
      let report
      try {
        report = JSON.parse(readFileSync(reportPath, 'utf8'))
      } catch {
        throw new Error('Scanner report is missing or invalid JSON')
      }
      const parsed = parseTrivyReport(report, scanType)
      const violatesPolicy = settings.blockOnCriticalCves && (
        parsed.vulnerabilities.some(item => item.severity === 'critical' || item.severity === 'high')
        || parsed.secretsFound > 0
      )
      failed = violatesPolicy
      scan = {
        ...base, ...parsed, scanType, image: scanType === 'container' ? image : undefined,
        status: violatesPolicy ? 'failed' : parsed.vulnerabilities.length || parsed.secretsFound ? 'warning' : 'passed',
        blockedBuild: violatesPolicy && !stage.allowFailure, scannedAt: new Date().toISOString(),
      }
      completed += 1
      onLines([`[trivy] ${scanType}: ${parsed.vulnerabilities.length} vulnerabilities, ${parsed.secretsFound} secrets; ${scan.status}`])
    } catch (error) {
      failed = true
      onLines([`[trivy] ${scanType} scan failed: ${error.message}`])
      scan = {
        ...base, scanType, image: scanType === 'container' ? image : undefined, status: 'error',
        error: 'Scanner could not produce a valid report. Check the pipeline stage logs.',
        blockedBuild: !stage.allowFailure, scannedAt: new Date().toISOString(),
      }
    } finally {
      rmSync(reportPath, { force: true })
    }
    await reportScan(scan)
    if (failed) exitCode = 1
  }

  if (exitCode === 0 && settings.trivyEnabled && settings.sbomEnabled) {
    const filename = `sbom-${randomUUID()}.json`
    let generated = false
    try {
      const result = await runCommand('docker', [
        'run', '--rm', '-v', '/var/run/docker.sock:/var/run/docker.sock', '-v', `${workDir}:/workspace`,
        'aquasec/trivy:latest', 'image', '--format', 'cyclonedx', '--output', `/workspace/${filename}`, image,
      ], { cwd: workDir, env }, onLines, timeoutMs)
      durationMs += result.durationMs
      generated = result.exitCode === 0 && existsSync(path.join(workDir, filename))
    } catch {
      onLines(['[trivy] SBOM command could not complete'])
    }
    exitCode = generated ? 0 : 1
    onLines([generated ? `[trivy] SBOM generated: ${filename}` : '[trivy] SBOM generation failed'])
    await reportScan({
      ...base, scanType: 'sbom', image, scannedAt: new Date().toISOString(),
      status: generated ? 'passed' : 'error', blockedBuild: !generated && !stage.allowFailure,
      error: generated ? undefined : 'SBOM generation failed. Check the pipeline stage logs.',
    })
  }
  return { exitCode, durationMs, skipped: completed === 0 && exitCode === 0 }
}
