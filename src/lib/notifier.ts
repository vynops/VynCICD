import nodemailer from 'nodemailer'
import { getSettings } from './settings-store'

export interface DeliveryResult { status: 'accepted' | 'failed' | 'skipped'; code: string }

async function postNotification(url: string, payload: unknown): Promise<DeliveryResult> {
  try {
    const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload), signal: AbortSignal.timeout(10000) })
    return { status: res.ok ? 'accepted' : 'failed', code: `http_${res.status}` }
  } catch { return { status: 'failed', code: 'network_or_timeout' } }
}

export async function sendSlack(text: string): Promise<DeliveryResult> {
  const { alertSlackEnabled, slackWebhookUrl } = getSettings()
  if (!alertSlackEnabled) return { status: 'skipped', code: 'disabled' }
  if (!slackWebhookUrl) return { status: 'failed', code: 'missing_endpoint' }
  return postNotification(slackWebhookUrl, { text })
}

export async function sendTeam(text: string): Promise<DeliveryResult> {
  const { alertTeamEnabled, teamsWebhookUrl } = getSettings()
  if (!alertTeamEnabled) return { status: 'skipped', code: 'disabled' }
  if (!teamsWebhookUrl) return { status: 'failed', code: 'missing_endpoint' }
  return postNotification(teamsWebhookUrl, {
        '@type': 'MessageCard',
        '@context': 'https://schema.org/extensions',
        summary: 'VynCICD notification',
        text,
  })
}

export async function sendCustomWebhook(payload: Record<string, unknown>): Promise<DeliveryResult> {
  const { alertWebhookEnabled, customWebhookUrl } = getSettings()
  if (!alertWebhookEnabled) return { status: 'skipped', code: 'disabled' }
  if (!customWebhookUrl) return { status: 'failed', code: 'missing_endpoint' }
  return postNotification(customWebhookUrl, payload)
}

export async function sendEmail(to: string[], subject: string, body: string): Promise<DeliveryResult> {
  const s = getSettings()
  if (!s.alertEmailEnabled) return { status: 'skipped', code: 'disabled' }
  if (!s.smtpHost || to.length === 0) return { status: 'failed', code: 'missing_smtp_or_recipients' }
  try {
    const transporter = nodemailer.createTransport({
      host: s.smtpHost,
      port: s.smtpPort || 587,
      secure: s.smtpPort === 465,
      auth: s.smtpUser ? { user: s.smtpUser, pass: s.smtpPassword } : undefined,
      tls: { rejectUnauthorized: true },
      requireTLS: s.smtpPort !== 465,
      connectionTimeout: 10000,
      greetingTimeout: 10000,
      socketTimeout: 10000,
    })
    const result = await transporter.sendMail({
      from: s.smtpFrom || s.smtpUser,
      to: to.join(', '),
      subject,
      text: body,
      html: `<pre style="font-family:monospace;font-size:13px">${body.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</pre>`,
    })
    return { status: result.rejected?.length ? 'failed' : 'accepted', code: result.rejected?.length ? 'smtp_recipient_rejected' : 'smtp_accepted' }
  } catch { return { status: 'failed', code: 'smtp_error' } }
}

export async function notifyBuildFailed(opts: {
  pipeline: string
  repo: string
  branch: string
  commit: string
  author: string
  error: string
  runUrl: string
  emails: string[]
}): Promise<void> {
  const msg = `🔴 *Build Failed* — \`${opts.repo}\` (${opts.branch})\nPipeline: ${opts.pipeline}\nCommit: \`${opts.commit.slice(0, 7)}\` by *${opts.author}*\nError: ${opts.error}\nView: ${opts.runUrl}`
  const plain = msg.replace(/\*/g, '').replace(/`/g, '')
  await Promise.all([
    sendSlack(msg),
    sendTeam(plain),
    sendCustomWebhook({
      event: 'build_failed',
      pipeline: opts.pipeline,
      repo: opts.repo,
      branch: opts.branch,
      commit: opts.commit,
      author: opts.author,
      error: opts.error,
      runUrl: opts.runUrl,
      at: new Date().toISOString(),
    }),
    sendEmail(opts.emails, `❌ Build Failed: ${opts.repo} (${opts.branch})`, plain),
  ])
}

export async function notifyBuildSucceeded(opts: {
  pipeline: string
  repo: string
  branch: string
  commit: string
  author: string
  durationMs: number
  emails: string[]
}): Promise<void> {
  const s = getSettings()
  if (!s.notifyOnSuccess) return
  const dur = Math.round(opts.durationMs / 1000)
  const msg = `✅ *Build Passed* — \`${opts.repo}\` (${opts.branch})\nPipeline: ${opts.pipeline} | Duration: ${dur}s\nCommit: \`${opts.commit.slice(0, 7)}\` by *${opts.author}*`
  const plain = msg.replace(/\*/g, '').replace(/`/g, '')
  await Promise.all([
    sendSlack(msg),
    sendTeam(plain),
    sendCustomWebhook({
      event: 'build_succeeded',
      pipeline: opts.pipeline,
      repo: opts.repo,
      branch: opts.branch,
      commit: opts.commit,
      author: opts.author,
      durationMs: opts.durationMs,
      at: new Date().toISOString(),
    }),
    sendEmail(opts.emails, `✅ Build Passed: ${opts.repo}`, plain),
  ])
}

export async function notifyDeployFailed(opts: {
  pipeline: string
  environment: string
  repo: string
  emails: string[]
}): Promise<void> {
  const msg = `🚨 *Deploy Failed* to \`${opts.environment}\` — \`${opts.repo}\`\nPipeline: ${opts.pipeline}\nOn-call has been notified.`
  const plain = msg.replace(/\*/g, '').replace(/`/g, '')
  await Promise.all([
    sendSlack(msg),
    sendTeam(plain),
    sendCustomWebhook({
      event: 'deploy_failed',
      pipeline: opts.pipeline,
      repo: opts.repo,
      environment: opts.environment,
      at: new Date().toISOString(),
    }),
    sendEmail(opts.emails, `🚨 Deploy Failed: ${opts.repo} → ${opts.environment}`, plain),
  ])
}

export async function notifyIncidentOpened(opts: {
  incidentId?: string
  title: string
  severity: 'critical' | 'high' | 'medium' | 'low'
  category: string
  source: string
  runId?: string
  repo?: string
  branch?: string
  commit?: string
  emails: string[]
}): Promise<void> {
  if (opts.incidentId) {
    if (process.env.INCIDENT_WORKER_ENABLED === 'false') return
    const { processIncidentNotifications } = await import('./incident-worker')
    await processIncidentNotifications(Date.now(), opts.incidentId)
    return
  }
  const msg = `🚨 *Incident Opened* — [${opts.severity.toUpperCase()}] ${opts.title}\nCategory: ${opts.category}\nSource: ${opts.source}${opts.repo ? `\nRepo: ${opts.repo}` : ''}${opts.branch ? `\nBranch: ${opts.branch}` : ''}${opts.commit ? `\nCommit: ${opts.commit.slice(0, 7)}` : ''}${opts.runId ? `\nRun ID: ${opts.runId}` : ''}`
  const plain = msg.replace(/\*/g, '')
  await Promise.all([
    sendSlack(msg),
    sendTeam(plain),
    sendCustomWebhook({
      event: 'incident_opened',
      title: opts.title,
      severity: opts.severity,
      category: opts.category,
      source: opts.source,
      runId: opts.runId,
      repo: opts.repo,
      branch: opts.branch,
      commit: opts.commit,
      at: new Date().toISOString(),
    }),
    sendEmail(opts.emails, `🚨 Incident Opened: ${opts.title}`, plain),
  ])
}
