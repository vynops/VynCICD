import fs from 'fs'
import path from 'path'
import { writeFileSync } from 'atomically'

interface DayUsage {
  requests: number
  promptTokens: number
  completionTokens: number
  totalTokens: number
}
type CopilotProvider = 'groq' | 'openai' | 'anthropic' | 'google' | 'custom'
type ModelUsage = DayUsage & { provider: CopilotProvider; model: string }
type DailyBucket = DayUsage & { byModel?: ModelUsage[] }
type UsageStore = Record<string, DailyBucket>
type DatedUsage = DayUsage & { date: string }
type DatedModelUsage = DatedUsage & ({ provider: CopilotProvider; model: string } | { provider: null; model: null })

export interface CopilotUsageSummary {
  today: DayUsage
  last7Days: DatedUsage[]
  last7DaysByModel: DatedModelUsage[]
  total: DayUsage
}

const DATA_DIR = path.join(process.cwd(), 'data')
const FILE = path.join(DATA_DIR, 'copilot-usage.json')

function utcDate(date: Date): string { return date.toISOString().slice(0, 10) }

function emptyUsage(): DayUsage {
  return { requests: 0, promptTokens: 0, completionTokens: 0, totalTokens: 0 }
}

function read(): UsageStore {
  try {
    return JSON.parse(fs.readFileSync(FILE, 'utf8')) as UsageStore
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return {}
    throw error
  }
}

function addUsage(target: DayUsage, source: DayUsage, direction = 1) {
  target.requests += direction * source.requests
  target.promptTokens += direction * source.promptTokens
  target.completionTokens += direction * source.completionTokens
  target.totalTokens += direction * source.totalTokens
}

export function recordUsage(provider: CopilotProvider, model: string, promptTokens: number, completionTokens: number): void {
  const store = read()
  const date = utcDate(new Date())
  const day = store[date] ??= emptyUsage()
  const byModel = day.byModel ??= []
  let entry = byModel.find(row => row.provider === provider && row.model === model)
  if (!entry) {
    entry = { provider, model, ...emptyUsage() }
    byModel.push(entry)
  }
  const usage = { requests: 1, promptTokens, completionTokens, totalTokens: promptTokens + completionTokens }
  addUsage(day, usage)
  addUsage(entry, usage)
  fs.mkdirSync(DATA_DIR, { recursive: true })
  writeFileSync(FILE, JSON.stringify(store, null, 2))
}

export function getCopilotUsageSummary(): CopilotUsageSummary {
  const store = read()
  const now = new Date()
  const last7Days: DatedUsage[] = []
  const last7DaysByModel: DatedModelUsage[] = []
  const total = emptyUsage()
  for (const day of Object.values(store)) addUsage(total, day)

  for (let i = 6; i >= 0; i--) {
    const day = new Date(now)
    day.setUTCDate(day.getUTCDate() - i)
    const date = utcDate(day)
    const bucket: DailyBucket = store[date] ?? emptyUsage()
    const { byModel: _byModel, ...usage } = bucket
    last7Days.push({ date, ...usage })
  }

  for (const { date, ...usage } of [...last7Days].reverse()) {
    const rows = [...(store[date]?.byModel ?? [])].sort((a, b) =>
      a.provider.localeCompare(b.provider) || a.model.localeCompare(b.model))
    for (const row of rows) {
      last7DaysByModel.push({ date, ...row })
      addUsage(usage, row, -1)
    }
    if (usage.requests > 0) last7DaysByModel.push({ date, provider: null, model: null, ...usage })
  }

  const { date: _date, ...today } = last7Days[last7Days.length - 1]
  return { today, last7Days, last7DaysByModel, total }
}
