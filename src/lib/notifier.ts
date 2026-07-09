import nodemailer from 'nodemailer'
import { getSettings } from './settings-store'

export async function sendSlack(text: string): Promise<void> {
  const { slackWebhookUrl } = getSettings()
  if (!slackWebhookUrl) return
  try {
    const res = await fetch(slackWebhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    })
    if (!res.ok) console.error('[notifier] Slack webhook failed:', res.status)
  } catch (e) { console.error('[notifier] Slack error:', e) }
}

export async function sendEmail(to: string[], subject: string, body: string): Promise<void> {
  const s = getSettings()
  if (!s.alertEmailEnabled || !s.smtpHost || to.length === 0) return
  try {
    const transporter = nodemailer.createTransport({
      host: s.smtpHost,
      port: s.smtpPort || 587,
      secure: s.smtpPort === 465,
      auth: s.smtpUser ? { user: s.smtpUser, pass: s.smtpPassword } : undefined,
      tls: { rejectUnauthorized: false },
    })
    await transporter.sendMail({
      from: s.smtpFrom || s.smtpUser,
      to: to.join(', '),
      subject,
      text: body,
      html: `<pre style="font-family:monospace;font-size:13px">${body.replace(/</g, '&lt;')}</pre>`,
    })
  } catch (e) { console.error('[notifier] Email error:', e) }
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
  await Promise.all([
    sendSlack(msg),
    sendEmail(opts.emails, `✅ Build Passed: ${opts.repo}`, msg.replace(/\*/g, '').replace(/`/g, '')),
  ])
}

export async function notifyDeployFailed(opts: {
  pipeline: string
  environment: string
  repo: string
  emails: string[]
}): Promise<void> {
  const msg = `🚨 *Deploy Failed* to \`${opts.environment}\` — \`${opts.repo}\`\nPipeline: ${opts.pipeline}\nOn-call has been notified.`
  await Promise.all([
    sendSlack(msg),
    sendEmail(opts.emails, `🚨 Deploy Failed: ${opts.repo} → ${opts.environment}`, msg.replace(/\*/g, '').replace(/`/g, '')),
  ])
}
