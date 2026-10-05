import fs from 'fs'
import path from 'path'
import crypto from 'crypto'
import { lockSync } from 'proper-lockfile'
import { writeFileSync } from 'atomically'
import { getSettings } from './settings-store'

const DATA = path.join(process.cwd(), 'data')
const ensure = () => { if (!fs.existsSync(DATA)) fs.mkdirSync(DATA, { recursive: true }) }

function load<T>(file: string, def: T): T {
  ensure()
  const f = path.join(DATA, file)
  if (!fs.existsSync(f)) return def
  return JSON.parse(fs.readFileSync(f, 'utf8')) as T
}
function save(file: string, data: unknown) {
  ensure()
  writeFileSync(path.join(DATA, file), JSON.stringify(data, null, 2), { mode: 0o600, fsync: true, timeout: 1000 })
}

// ─── On-Call Shifts ───────────────────────────────────────────────────────────
export interface Shift {
  id: string
  name: string
  userEmail: string
  userName: string
  startTime: string
  endTime: string
  timezone: string
}
export interface OnCallStore { shifts: Shift[] }
const defaultOncall: OnCallStore = { shifts: [] }
export function loadOncall(): OnCallStore { return load('oncall.json', defaultOncall) }
export function saveOncall(data: OnCallStore) { save('oncall.json', data) }

export function currentOnCallEmails(): string[] {
  const now = new Date()
  return loadOncall().shifts
    .filter(s => new Date(s.startTime) <= now && new Date(s.endTime) > now)
    .map(s => s.userEmail)
}
export function currentOnCallPerson(): Shift | null {
  const now = new Date()
  return loadOncall().shifts.find(s => new Date(s.startTime) <= now && new Date(s.endTime) > now) ?? null
}

// ─── Routing Rules ────────────────────────────────────────────────────────────
export interface RoutingRule {
  id: string
  name: string
  severity: string
  category: string
  notifyEmails: string[]
  notifySlack: boolean
  notifyOncall: boolean
  escalationPolicyId: string
}
const defaultRouting: RoutingRule[] = [
  {
    id: 'default',
    name: 'Default — notify on-call',
    severity: '*',
    category: '*',
    notifyEmails: [],
    notifySlack: true,
    notifyOncall: true,
    escalationPolicyId: 'default',
  },
]
export function loadRouting(): RoutingRule[] { return load('routing.json', defaultRouting) }
export function saveRouting(rules: RoutingRule[]) { save('routing.json', rules) }

export function matchRouting(severity: string, category: string): RoutingRule {
  const rules = loadRouting()
  return (
    rules.find(r => r.severity === severity && r.category === category) ??
    rules.find(r => r.severity === severity && r.category === '*') ??
    rules.find(r => r.severity === '*' && r.category === category) ??
    rules.find(r => r.severity === '*' && r.category === '*') ??
    defaultRouting[0]
  )
}

// ─── Escalation Policies ─────────────────────────────────────────────────────
export interface EscalationStep {
  delayMin: number
  notifyEmails: string[]
  notifySlack: boolean
  notifyOncall: boolean
}
export interface EscalationPolicy {
  id: string
  name: string
  steps: EscalationStep[]
}
const defaultPolicies: EscalationPolicy[] = [
  {
    id: 'default',
    name: 'Default Escalation',
    steps: [
      { delayMin: 15, notifyEmails: [], notifySlack: true, notifyOncall: true },
      { delayMin: 30, notifyEmails: [], notifySlack: true, notifyOncall: true },
    ],
  },
]
export function loadPolicies(): EscalationPolicy[] { return load('policies.json', defaultPolicies) }
export function savePolicies(p: EscalationPolicy[]) { save('policies.json', p) }
export function findPolicy(id: string): EscalationPolicy | null {
  return loadPolicies().find(p => p.id === id) ?? null
}

// ─── SLA Tiers ────────────────────────────────────────────────────────────────
export interface SlaTier { ackMinutes: number; resolveMinutes: number }
export type SlaStore = Record<string, SlaTier>
const defaultSla: SlaStore = {
  critical: { ackMinutes: 15, resolveMinutes: 60 },
  high:     { ackMinutes: 30, resolveMinutes: 120 },
  medium:   { ackMinutes: 120, resolveMinutes: 480 },
  low:      { ackMinutes: 480, resolveMinutes: 1440 },
}
export function loadSla(): SlaStore { return load('sla.json', defaultSla) }
export function saveSla(s: SlaStore) { save('sla.json', s) }

// ─── Seen Alerts ──────────────────────────────────────────────────────────────
export interface SeenAlert {
  id: string
  firstSeenAt: string
  severity: string
  title: string
  notifiedAt?: string
  ackBreachNotifiedAt?: string
  resolveBreachNotifiedAt?: string
  escalationStepsFired: number[]
}
export function loadSeenAlerts(): Record<string, SeenAlert> { return load('seen-alerts.json', {}) }
export function saveSeenAlerts(s: Record<string, SeenAlert>) { save('seen-alerts.json', s) }

// ─── Incidents ────────────────────────────────────────────────────────────────
export interface Incident {
  id: string
  title: string
  severity: 'critical' | 'high' | 'medium' | 'low'
  status: 'open' | 'acknowledged' | 'resolved'
  category: string
  source: string       // e.g. pipeline name
  runId?: string
  repo?: string
  branch?: string
  commit?: string
  author?: string
  createdAt: string
  updatedAt: string
  resolvedAt?: string
  acknowledgedAt?: string
  reopenedAt?: string
  history?: IncidentAction[]
  alertKey?: string
  deliveries?: IncidentDelivery[]
  automation?: {
    episodeId?: string
    policy: EscalationPolicy | null
    sla: SlaTier | null
    stepsFired: number[]
    ackBreach?: boolean
    resolveBreach?: boolean
  }
  notes?: string
  assignedTo?: string
  _demo?: boolean
}

export interface IncidentAction {
  id: string
  at: string
  actor: string
  action: string
  changes: Record<string, { from: unknown; to: unknown }>
}

export interface IncidentDelivery {
  id: string
  event: string
  episodeId?: string
  channel: 'slack' | 'teams' | 'webhook' | 'email'
  emails: string[]
  status: 'pending' | 'processing' | 'sent' | 'failed' | 'skipped'
  createdAt: string
  nextAttemptAt: string
  claim?: string
  leaseUntil?: string
  attempts: { at: string; result: string; code?: string }[]
  snapshot: { title: string; severity: string; status: string; source: string; category?: string; runId?: string; repo?: string; branch?: string; commit?: string }
}

export type IncidentInput = Omit<Incident, 'id' | 'createdAt' | 'updatedAt' | 'acknowledgedAt' | 'resolvedAt' | 'reopenedAt' | 'history' | 'alertKey' | 'deliveries' | 'automation'>

export function enqueueIncidentEvent(incident: Incident, event: string, now = Date.now(), override?: EscalationStep) {
  const episodeId = incident.automation?.episodeId ?? incident.createdAt
  if (incident.deliveries?.some(delivery => delivery.event === event && (delivery.episodeId ?? incident.createdAt) === episodeId)) return
  const settings = getSettings()
  const rule = override ?? matchRouting(incident.severity, incident.category)
  const configured = (settings.alertRecipients ?? '').split(',').map(email => email.trim()).filter(Boolean)
  const routed = [...rule.notifyEmails, ...(rule.notifyOncall ? currentOnCallEmails() : [])]
  const emails = [...new Set(routed.length ? routed : configured)]
  const at = new Date(now).toISOString()
  const enabled = {
    slack: settings.alertSlackEnabled && rule.notifySlack,
    teams: settings.alertTeamEnabled,
    webhook: settings.alertWebhookEnabled,
    email: settings.alertEmailEnabled && emails.length > 0,
  }
  incident.deliveries ??= []
  for (const channel of ['slack', 'teams', 'webhook', 'email'] as const) {
    incident.deliveries.push({ id: crypto.randomUUID(), event, episodeId, channel, emails: channel === 'email' ? emails : [],
      status: enabled[channel] ? 'pending' : 'skipped', createdAt: at, nextAttemptAt: at,
      snapshot: { title: incident.title, severity: incident.severity, status: incident.status, source: incident.source, category: incident.category, runId: incident.runId, repo: incident.repo, branch: incident.branch, commit: incident.commit },
      attempts: enabled[channel] ? [] : [{ at, result: 'skipped', code: 'disabled_or_no_recipients' }],
    })
  }
  incident.history ??= []
  incident.history.push({ id: crypto.randomUUID(), at, actor: 'system', action: 'notification_queued', changes: { event: { from: null, to: event } } })
}

export function loadIncidentWorkerStatus(): Record<string, unknown> { return load('incident-worker-status.json', {}) }
export function saveIncidentWorkerStatus(status: Record<string, unknown>) { save('incident-worker-status.json', status) }

export class IncidentInputError extends Error {}
export class IncidentMissingError extends Error {}

function validateIncident(data: Record<string, unknown>, creating: boolean) {
  if (!data || typeof data !== 'object' || Array.isArray(data)) throw new IncidentInputError('Invalid incident fields')
  const allowed = creating
    ? ['title', 'severity', 'status', 'category', 'source', 'runId', 'repo', 'branch', 'commit', 'author', 'notes', 'assignedTo', '_demo']
    : ['title', 'severity', 'status', 'category', 'source', 'notes', 'assignedTo']
  if (Object.keys(data).some(key => !allowed.includes(key))) throw new IncidentInputError('Invalid incident fields')
  if (data.status !== undefined && (typeof data.status !== 'string' || !['open', 'acknowledged', 'resolved'].includes(data.status))) throw new IncidentInputError('Invalid status')
  if (data.severity !== undefined && (typeof data.severity !== 'string' || !['critical', 'high', 'medium', 'low'].includes(data.severity))) throw new IncidentInputError('Invalid severity')
  for (const key of allowed.filter(key => !['status', 'severity', '_demo'].includes(key))) {
    if (data[key] !== undefined && (typeof data[key] !== 'string' || String(data[key]).length > (key === 'notes' ? 20000 : 500))) throw new IncidentInputError('Invalid incident text')
  }
  if (data.title !== undefined && !String(data.title).trim()) throw new IncidentInputError('Invalid title')
  if (creating && (!data.title || !data.severity || !data.status || typeof data.category !== 'string' || typeof data.source !== 'string')) throw new IncidentInputError('Required incident fields missing')
}

export function loadIncidents(): Incident[] {
  const incidents = load<Incident[]>('incidents.json', [])
  if (!Array.isArray(incidents)) throw new Error('Invalid incident storage')
  return incidents
}
export function saveIncidents(incidents: Incident[]) { save('incidents.json', incidents) }

export function transactIncidents<T>(change: (incidents: Incident[]) => T): T {
  ensure()
  const release = lockSync(path.join(DATA, 'incidents.json'), { realpath: false, stale: 30000 })
  try {
    const incidents = loadIncidents()
    if (!Array.isArray(incidents)) throw new Error('Invalid incident storage')
    const result = change(incidents)
    saveIncidents(incidents)
    return result
  } finally { release() }
}

export function createIncident(data: IncidentInput, actor = 'system'): Incident {
  validateIncident(data as unknown as Record<string, unknown>, true)
  return transactIncidents(incidents => {
    if (data.runId) {
      const existing = incidents.find(incident => incident.runId === data.runId && incident.status !== 'resolved')
      if (existing) return existing
    }
    const inc = newIncident(data, actor)
    incidents.unshift(inc)
    return inc
  })
}

function newIncident(data: IncidentInput, actor: string): Incident {
  validateIncident(data as unknown as Record<string, unknown>, true)
  const now = new Date().toISOString()
  const inc: Incident = {
    ...data,
    id: crypto.randomUUID(),
    createdAt: now,
    updatedAt: now,
    ...(data.status === 'acknowledged' ? { acknowledgedAt: now } : {}),
    ...(data.status === 'resolved' ? { resolvedAt: now } : {}),
    history: [{ id: crypto.randomUUID(), at: now, actor, action: 'created', changes: { status: { from: null, to: data.status } } }],
  }
  if (!inc._demo) {
    const rule = matchRouting(inc.severity, inc.category)
    inc.automation = { episodeId: crypto.randomUUID(), policy: findPolicy(rule.escalationPolicyId), sla: loadSla()[inc.severity] ?? null, stepsFired: [] }
    enqueueIncidentEvent(inc, data.status === 'open' ? 'opened' : data.status, Date.parse(now))
  }
  return inc
}

export function updateIncident(id: string, updates: Partial<Incident>, actor = 'system'): Incident {
  return transactIncidents(incidents => applyIncidentUpdate(incidents, id, updates, actor))
}

function applyIncidentUpdate(incidents: Incident[], id: string, updates: Partial<Incident>, actor: string): Incident {
  if (!updates || typeof updates !== 'object' || Array.isArray(updates)) throw new IncidentInputError('Invalid incident fields')
  validateIncident(updates as Record<string, unknown>, false)
  const idx = incidents.findIndex(i => i.id === id)
  if (idx === -1) throw new IncidentMissingError('Incident not found')
  const previous = incidents[idx]
  if (previous.status === 'resolved' && updates.status === 'acknowledged') throw new IncidentInputError('Reopen incident before acknowledgement')
  const changes = Object.fromEntries(Object.entries(updates).filter(([key, value]) => previous[key as keyof Incident] !== value).map(([key, value]) => [key, { from: previous[key as keyof Incident] ?? null, to: value }]))
  if (!Object.keys(changes).length) return previous
  const now = new Date().toISOString()
  incidents[idx] = {
    ...previous, ...updates, updatedAt: now,
    ...(updates.status === 'acknowledged' ? { acknowledgedAt: previous.acknowledgedAt ?? now, resolvedAt: undefined } : {}),
    ...(updates.status === 'resolved' ? { resolvedAt: previous.status === 'resolved' ? previous.resolvedAt ?? now : now } : {}),
    ...(updates.status === 'open' ? { acknowledgedAt: undefined, resolvedAt: undefined } : {}),
    history: [...(previous.history ?? []), { id: crypto.randomUUID(), at: now, actor, action: 'updated', changes }],
  }
  if (updates.status === 'open' && previous.status !== 'open') {
    const rule = matchRouting(incidents[idx].severity, incidents[idx].category)
    incidents[idx].reopenedAt = now
    incidents[idx].automation = { episodeId: crypto.randomUUID(), policy: findPolicy(rule.escalationPolicyId), sla: loadSla()[incidents[idx].severity] ?? null, stepsFired: [] }
  }
  if (!incidents[idx]._demo) enqueueIncidentEvent(incidents[idx], `${updates.status ?? 'updated'}:${incidents[idx].history!.at(-1)!.id}`, Date.parse(now))
  return incidents[idx]
}

export function correlateAlert(key: string, status: 'firing' | 'resolved', data: IncidentInput): { incident: Incident | null; created: boolean } {
  return transactIncidents(incidents => {
    const existing = incidents.find(incident => incident.alertKey === key)
    if (existing) {
      return { incident: status === 'resolved' && existing.status !== 'resolved'
        ? applyIncidentUpdate(incidents, existing.id, { status: 'resolved' }, 'alertmanager')
        : existing, created: false }
    }
    if (status === 'resolved') return { incident: null, created: false }
    const incident = newIncident(data, 'alertmanager')
    incident.alertKey = key
    incidents.unshift(incident)
    return { incident, created: true }
  })
}
