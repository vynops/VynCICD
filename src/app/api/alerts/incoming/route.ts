import { NextRequest, NextResponse } from 'next/server'
import { createIncident } from '@/lib/oncall-store'
import type { Incident } from '@/lib/oncall-store'
import { getSettings } from '@/lib/settings-store'
import { notifyIncidentOpened } from '@/lib/notifier'

// Prometheus AlertManager sends an array of alerts
interface AmAlert {
  status: 'firing' | 'resolved'
  labels: Record<string, string>
  annotations: Record<string, string>
  startsAt: string
  endsAt: string
  fingerprint: string
}
interface AmPayload {
  receiver: string
  status: string
  alerts: AmAlert[]
  groupLabels?: Record<string, string>
  commonLabels?: Record<string, string>
  commonAnnotations?: Record<string, string>
}

function amSeverityToIncident(s: string): Incident['severity'] {
  switch (s?.toLowerCase()) {
    case 'critical': return 'critical'
    case 'high':
    case 'error': return 'high'
    case 'warning': return 'medium'
    default: return 'low'
  }
}

function recipientsFromSettings(): string[] {
  const s = getSettings()
  return (s.alertRecipients ?? '')
    .split(',')
    .map(v => v.trim())
    .filter(Boolean)
}

export async function POST(req: NextRequest) {
  // AlertManager can be configured with a shared secret via header
  const secret = process.env.ALERTMANAGER_SECRET ?? ''
  if (secret) {
    const provided = req.headers.get('x-alertmanager-secret') ?? ''
    if (provided !== secret) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  let body: AmPayload
  try {
    body = await req.json() as AmPayload
  } catch {
    return NextResponse.json({ error: 'invalid json' }, { status: 400 })
  }

  const created: string[] = []

  for (const alert of body.alerts ?? []) {
    if (alert.status !== 'firing') continue  // ignore resolved for now

    const title =
      alert.annotations?.summary ??
      alert.labels?.alertname ??
      'Unknown Alert'

    const severity = amSeverityToIncident(
      alert.labels?.severity ?? alert.labels?.priority ?? ''
    )

    const inc = createIncident({
      title: title.slice(0, 200),
      severity,
      status: 'open',
      category: alert.labels?.category ?? alert.labels?.job ?? 'monitoring',
      source: `alertmanager:${alert.labels?.alertname ?? 'unknown'}`,
      notes: alert.annotations?.description ?? alert.annotations?.message ?? '',
    })

    notifyIncidentOpened({
      title: inc.title,
      severity: inc.severity,
      category: inc.category,
      source: inc.source,
      runId: inc.runId,
      repo: inc.repo,
      branch: inc.branch,
      commit: inc.commit,
      emails: recipientsFromSettings(),
    }).catch(() => {})

    created.push(inc.id)
    console.log(`[alerts/incoming] created incident ${inc.id} "${inc.title}" severity=${inc.severity}`)
  }

  return NextResponse.json({ ok: true, created }, { status: 201 })
}
