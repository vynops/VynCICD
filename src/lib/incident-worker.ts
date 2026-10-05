import crypto from 'crypto'
import { enqueueIncidentEvent, loadIncidents, saveIncidentWorkerStatus, transactIncidents } from './oncall-store'
import type { Incident, IncidentDelivery } from './oncall-store'
import { sendSlack, sendTeam, sendEmail, sendCustomWebhook } from './notifier'
import type { DeliveryResult } from './notifier'

function audit(incident: Incident, action: string, event: string, now: number) {
  incident.history ??= []
  incident.history.push({ id: crypto.randomUUID(), at: new Date(now).toISOString(), actor: 'incident-worker', action, changes: { event: { from: null, to: event } } })
}

export function scheduleIncidentEvents(now = Date.now()) {
  transactIncidents(incidents => {
    for (const incident of incidents) {
      if (!incident.automation || incident._demo) continue
      const elapsed = now - Date.parse(incident.reopenedAt ?? incident.createdAt)
      const { policy, sla } = incident.automation
      if (incident.status === 'open') {
        for (const [index, step] of (policy?.steps ?? []).entries()) {
          if (Number.isFinite(step.delayMin) && step.delayMin >= 0 && elapsed >= step.delayMin * 60000 && !incident.automation.stepsFired.includes(index)) {
            enqueueIncidentEvent(incident, `escalation:${index}`, now, step)
            incident.automation.stepsFired.push(index)
          }
        }
        if (sla && elapsed >= sla.ackMinutes * 60000 && !incident.automation.ackBreach) {
          enqueueIncidentEvent(incident, 'sla_ack', now)
          incident.automation.ackBreach = true
        }
      }
      if (incident.status !== 'resolved' && sla && elapsed >= sla.resolveMinutes * 60000 && !incident.automation.resolveBreach) {
        enqueueIncidentEvent(incident, 'sla_resolve', now)
        incident.automation.resolveBreach = true
      }
    }
  })
}

function claimDelivery(now: number, incidentId?: string): { incident: Incident; delivery: IncidentDelivery } | null {
  return transactIncidents(incidents => {
    for (const incident of incidents) {
      if (incidentId && incident.id !== incidentId) continue
      for (const delivery of incident.deliveries ?? []) {
        if (!['pending', 'processing'].includes(delivery.status)) continue
        if (delivery.status === 'processing' && Date.parse(delivery.leaseUntil ?? '') > now) continue
        if (Date.parse(delivery.nextAttemptAt) > now) continue
        const timed = delivery.event.startsWith('escalation:') || delivery.event.startsWith('sla_')
        const staleEpisode = (delivery.episodeId ?? incident.createdAt) !== (incident.automation?.episodeId ?? incident.createdAt)
        if (timed && staleEpisode || (delivery.event.startsWith('escalation:') || delivery.event === 'sla_ack') && incident.status !== 'open' || delivery.event === 'sla_resolve' && incident.status === 'resolved') {
          delivery.status = 'skipped'
          delivery.attempts.push({ at: new Date(now).toISOString(), result: 'skipped', code: 'incident_no_longer_due' })
          audit(incident, 'notification_cancelled', delivery.event, now)
          continue
        }
        if (delivery.attempts.length >= 8) { delivery.status = 'failed'; audit(incident, 'notification_exhausted', delivery.event, now); continue }
        delivery.status = 'processing'
        delivery.claim = crypto.randomUUID()
        delivery.leaseUntil = new Date(now + 60000).toISOString()
        delivery.attempts.push({ at: new Date(now).toISOString(), result: 'processing' })
        audit(incident, 'notification_attempted', `${delivery.event}:${delivery.channel}`, now)
        return { incident: structuredClone(incident), delivery: structuredClone(delivery) }
      }
    }
    return null
  })
}

async function deliver(incident: Incident, delivery: IncidentDelivery): Promise<DeliveryResult> {
  const snapshot = delivery.snapshot ?? incident
  const event = delivery.event.split(':')[0]
  const labels: Record<string, string> = { opened: 'Opened', open: 'Reopened', acknowledged: 'Acknowledged', resolved: 'Resolved', updated: 'Updated', escalation: 'Escalated', sla_ack: 'Acknowledgement SLA breached', sla_resolve: 'Resolution SLA breached' }
  const label = labels[event] ?? event
  const text = `Incident ${label}: [${snapshot.severity.toUpperCase()}] ${snapshot.title}\nStatus: ${snapshot.status}\nSource: ${snapshot.source}${snapshot.repo ? `\nRepo: ${snapshot.repo}` : ''}${snapshot.branch ? `\nBranch: ${snapshot.branch}` : ''}${snapshot.runId ? `\nRun ID: ${snapshot.runId}` : ''}\nIncident ID: ${incident.id}`
  if (delivery.channel === 'slack') return sendSlack(text)
  if (delivery.channel === 'teams') return sendTeam(text)
  if (delivery.channel === 'email') return sendEmail(delivery.emails, `Incident ${label}: ${snapshot.title}`, text)
  return sendCustomWebhook({ event: `incident_${event}`, eventReference: delivery.event, episodeId: delivery.episodeId, incidentId: incident.id, deliveryId: delivery.id, ...snapshot, at: delivery.createdAt })
}

export async function processIncidentNotifications(now = Date.now(), incidentId?: string) {
  const startedAt = Date.now()
  for (let count = 0; count < 32; count++) {
    const currentTime = now + Date.now() - startedAt
    const work = claimDelivery(currentTime, incidentId)
    if (!work) break
    const result = await deliver(work.incident, work.delivery)
    transactIncidents(incidents => {
      const incident = incidents.find(entry => entry.id === work.incident.id)
      const delivery = incident?.deliveries?.find(entry => entry.id === work.delivery.id)
      if (!incident || !delivery || delivery.claim !== work.delivery.claim) return
      const completedAt = now + Date.now() - startedAt
      delivery.attempts[delivery.attempts.length - 1] = { at: new Date(completedAt).toISOString(), result: result.status, code: result.code }
      delivery.status = result.status === 'accepted' ? 'sent' : result.status === 'skipped' ? 'skipped' : delivery.attempts.length >= 8 ? 'failed' : 'pending'
      delivery.nextAttemptAt = new Date(completedAt + Math.min(3600000, 30000 * 2 ** (delivery.attempts.length - 1))).toISOString()
      delete delivery.claim
      delete delivery.leaseUntil
      audit(incident, `notification_${result.status}`, `${delivery.event}:${delivery.channel}:${result.code}`, completedAt)
    })
  }
}

export async function runIncidentWorkerCycle(now = Date.now()) {
  try {
    scheduleIncidentEvents(now)
    await processIncidentNotifications(now)
    const jobs = loadIncidents().flatMap(incident => incident.deliveries ?? [])
    saveIncidentWorkerStatus({ lastCompletedAt: new Date(now).toISOString(), pending: jobs.filter(job => ['pending', 'processing'].includes(job.status)).length, failed: jobs.filter(job => job.status === 'failed').length, error: null })
  } catch (error) {
    const code = error instanceof Error ? error.name : 'unknown_error'
    const failure = error as NodeJS.ErrnoException
    saveIncidentWorkerStatus({ lastFailedAt: new Date(now).toISOString(), error: 'storage_or_worker_unavailable', errorType: code, errorCode: failure.code ?? null, operation: failure.syscall ?? null })
    throw error
  }
}

export function startIncidentWorker() {
  const runtime = globalThis as typeof globalThis & { incidentWorkerStarted?: boolean }
  if (runtime.incidentWorkerStarted || process.env.INCIDENT_WORKER_ENABLED === 'false') return
  runtime.incidentWorkerStarted = true
  let running = false
  const cycle = async () => {
    if (running) return
    running = true
    try { await runIncidentWorkerCycle() } catch { console.error('[incident-worker] cycle failed; inspect worker status') }
    finally { running = false }
  }
  const initialCycle = cycle()
  setInterval(() => { void cycle() }, 15000).unref()
  return initialCycle
}