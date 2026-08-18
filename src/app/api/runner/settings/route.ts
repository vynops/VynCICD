import { NextRequest, NextResponse } from 'next/server'
import { getSettings } from '@/lib/settings-store'

const RUNNER_SECRET = process.env.RUNNER_SECRET ?? process.env.VYNCICD_SECRET ?? ''

export async function GET(req: NextRequest) {
  const token = req.headers.get('x-runner-token') ?? ''
  if (RUNNER_SECRET && token !== RUNNER_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const settings = getSettings()
  return NextResponse.json({
    trivyEnabled: settings.trivyEnabled,
    secretScanEnabled: settings.secretScanEnabled,
    sbomEnabled: settings.sbomEnabled,
    blockOnCriticalCves: settings.blockOnCriticalCves,
    defaultRetryCount: settings.defaultRetryCount,
    defaultTimeoutMinutes: settings.defaultTimeoutMinutes,
    buildConcurrency: settings.buildConcurrency,
  })
}
