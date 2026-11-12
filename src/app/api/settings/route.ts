import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth'
import { getSettings, saveSettings } from '@/lib/settings-store'
import { CONFIGURED_MASK, SECRET_SETTING_FIELDS, maskSettings } from '@/lib/settings-fields'

const NUMBER_LIMITS: Record<string, [number, number]> = {
  defaultRetryCount: [0, 5], defaultTimeoutMinutes: [1, 360], buildConcurrency: [1, 20],
  slowBuildThresholdMinutes: [1, 120], smtpPort: [1, 65535], defaultRefreshInterval: [10, 300],
  deploymentFrequencyTarget: [1, Number.MAX_SAFE_INTEGER], leadTimeTargetHours: [1, Number.MAX_SAFE_INTEGER],
  mttrTargetMinutes: [1, Number.MAX_SAFE_INTEGER], changeFailureRateTarget: [1, 100],
}

export async function GET(req: NextRequest) {
  const auth = await requireRole(req, 'viewer')
  if (auth instanceof NextResponse) return auth
  return NextResponse.json(maskSettings(getSettings()))
}

export async function POST(req: NextRequest) {
  const auth = await requireRole(req, 'admin')
  if (auth instanceof NextResponse) return auth
  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid settings JSON.' }, { status: 400 })
  }
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return NextResponse.json({ error: 'Settings must be an object.' }, { status: 400 })
  }
  const current = getSettings()
  for (const [key, value] of Object.entries(body)) {
    if (!Object.prototype.hasOwnProperty.call(current, key) || typeof value !== typeof Reflect.get(current, key)
      || typeof value === 'number' && !Number.isFinite(value)) {
      return NextResponse.json({ error: `Invalid setting: ${key}.` }, { status: 400 })
    }
    for (const [key, [min, max]] of Object.entries(NUMBER_LIMITS)) {
      const value = body[key]
      if (value !== undefined && (typeof value !== 'number' || !Number.isSafeInteger(value) || value < min || value > max)) {
        return NextResponse.json({ error: `${key} must be an integer from ${min} to ${max}.` }, { status: 400 })
      }
    }
    if (body.aiProvider !== undefined && !['groq', 'openai', 'anthropic', 'google', 'custom'].includes(String(body.aiProvider))) {
      return NextResponse.json({ error: 'Invalid AI provider.' }, { status: 400 })
    }
  }
  for (const key of SECRET_SETTING_FIELDS) {
    if (body[key] === CONFIGURED_MASK) delete body[key]
  }
  const updated = saveSettings(body)
  return NextResponse.json(maskSettings(updated))
}
