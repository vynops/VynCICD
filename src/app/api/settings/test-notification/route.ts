import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth'
import { getSettings } from '@/lib/settings-store'
import { sendEmail } from '@/lib/notifier'

interface TestResult { success: boolean; message: string }

export async function POST(req: NextRequest) {
  const auth = await requireRole(req, 'admin')
  if (auth instanceof NextResponse) return auth

  const { target } = await req.json() as { target: 'slack' | 'smtp' | 'team' | 'webhook' }
  const s = getSettings()

  // ── Slack ──────────────────────────────────────────────────────────────────
  if (target === 'slack') {
    if (!s.slackWebhookUrl) {
      return NextResponse.json<TestResult>({ success: false, message: 'No Slack webhook URL configured.' })
    }
    try {
      const res = await fetch(s.slackWebhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: '✅ *VynCICD* — test notification. Slack integration is working.' }),
        signal: AbortSignal.timeout(8000),
      })
      if (res.ok) {
        return NextResponse.json<TestResult>({ success: true, message: 'Test message sent to Slack successfully.' })
      }
      const text = await res.text().catch(() => '')
      return NextResponse.json<TestResult>({ success: false, message: `Slack returned HTTP ${res.status}${text ? ': ' + text : ''}` })
    } catch (e) {
      const err = e as { message?: string }
      return NextResponse.json<TestResult>({ success: false, message: `Slack unreachable: ${err.message ?? 'unknown error'}` })
    }
  }

  // ── SMTP ───────────────────────────────────────────────────────────────────
  if (target === 'smtp') {
    if (!s.smtpHost || !s.smtpPort) {
      return NextResponse.json<TestResult>({ success: false, message: 'SMTP host and port are required.' })
    }
    const to = s.alertRecipients?.split(',')[0]?.trim()
    if (!to) {
      return NextResponse.json<TestResult>({ success: false, message: 'No recipient configured — add an address in Default recipients.' })
    }
    try {
      const result = await sendEmail([to], 'VynCICD test notification', 'VynCICD email delivery test.')
      return NextResponse.json<TestResult>({
        success: result.status === 'accepted',
        message: result.status === 'accepted' ? 'SMTP accepted the test message. Confirm receipt at the destination.' : `Email test not accepted: ${result.code}`,
      })
    } catch (e) {
      return NextResponse.json<TestResult>({ success: false, message: 'Email delivery test failed.' })
    }
  }

  // ── Microsoft Teams ───────────────────────────────────────────────────────
  if (target === 'team') {
    if (!s.teamsWebhookUrl) {
      return NextResponse.json<TestResult>({ success: false, message: 'No Microsoft Teams webhook URL configured.' })
    }
    try {
      const res = await fetch(s.teamsWebhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          '@type': 'MessageCard',
          '@context': 'https://schema.org/extensions',
          summary: 'VynCICD test notification',
          text: 'VynCICD test notification. Microsoft Teams integration is working.',
        }),
        signal: AbortSignal.timeout(8000),
      })
      if (res.ok) {
        return NextResponse.json<TestResult>({ success: true, message: 'Test message sent to Microsoft Teams successfully.' })
      }
      const text = await res.text().catch(() => '')
      return NextResponse.json<TestResult>({ success: false, message: `Microsoft Teams returned HTTP ${res.status}${text ? ': ' + text : ''}` })
    } catch (e) {
      const err = e as { message?: string }
      return NextResponse.json<TestResult>({ success: false, message: `Microsoft Teams unreachable: ${err.message ?? 'unknown error'}` })
    }
  }

  // ── Custom Webhook ────────────────────────────────────────────────────────
  if (target === 'webhook') {
    if (!s.customWebhookUrl) {
      return NextResponse.json<TestResult>({ success: false, message: 'No custom webhook URL configured.' })
    }
    try {
      const res = await fetch(s.customWebhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          alert_type: 'test',
          title: 'VynCICD test notification',
          description: 'Test notification from VynCICD Settings',
          severity: 'info',
          timestamp: new Date().toISOString(),
          source: 'vyncicd/settings',
        }),
        signal: AbortSignal.timeout(8000),
      })
      if (res.ok) {
        return NextResponse.json<TestResult>({ success: true, message: 'Test event delivered to custom webhook successfully.' })
      }
      const text = await res.text().catch(() => '')
      return NextResponse.json<TestResult>({ success: false, message: `Custom webhook returned HTTP ${res.status}${text ? ': ' + text : ''}` })
    } catch (e) {
      const err = e as { message?: string }
      return NextResponse.json<TestResult>({ success: false, message: `Custom webhook unreachable: ${err.message ?? 'unknown error'}` })
    }
  }

  return NextResponse.json<TestResult>({ success: false, message: `Unknown target: ${target}` }, { status: 400 })
}
