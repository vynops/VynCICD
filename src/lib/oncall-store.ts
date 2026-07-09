import fs from 'fs'
import path from 'path'
import crypto from 'crypto'

const DATA = path.join(process.cwd(), 'data')
const ensure = () => { if (!fs.existsSync(DATA)) fs.mkdirSync(DATA, { recursive: true }) }

function load<T>(file: string, def: T): T {
  ensure()
  const f = path.join(DATA, file)
  if (!fs.existsSync(f)) return def
  try { return JSON.parse(fs.readFileSync(f, 'utf8')) as T } catch { return def }
}
function save(file: string, data: unknown) {
  ensure()
  fs.writeFileSync(path.join(DATA, file), JSON.stringify(data, null, 2), 'utf8')
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
  notes?: string
  assignedTo?: string
  _demo?: boolean
}

export function loadIncidents(): Incident[] { return load('incidents.json', []) }
export function saveIncidents(incidents: Incident[]) { save('incidents.json', incidents) }

export function createIncident(data: Omit<Incident, 'id' | 'createdAt' | 'updatedAt'>): Incident {
  const incidents = loadIncidents()
  const inc: Incident = {
    ...data,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
  incidents.unshift(inc)
  saveIncidents(incidents)
  return inc
}

export function updateIncident(id: string, updates: Partial<Incident>): Incident {
  const incidents = loadIncidents()
  const idx = incidents.findIndex(i => i.id === id)
  if (idx === -1) throw new Error('Incident not found')
  incidents[idx] = { ...incidents[idx], ...updates, updatedAt: new Date().toISOString() }
  saveIncidents(incidents)
  return incidents[idx]
}
