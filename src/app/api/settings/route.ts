import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth'
import { getSettings, saveSettings } from '@/lib/settings-store'

const CONFIGURED_MASK = '***configured***'

export async function GET(req: NextRequest) {
  const auth = await requireRole(req, 'viewer')
  if (auth instanceof NextResponse) return auth
  const s = getSettings()
  return NextResponse.json({
    ...s,
    k8sToken: s.k8sToken ? CONFIGURED_MASK : '',
    registryPassword: s.registryPassword ? CONFIGURED_MASK : '',
  })
}

export async function POST(req: NextRequest) {
  const auth = await requireRole(req, 'admin')
  if (auth instanceof NextResponse) return auth
  const body = await req.json()
  if (body.k8sToken === CONFIGURED_MASK) delete body.k8sToken
  if (body.registryPassword === CONFIGURED_MASK) delete body.registryPassword
  const updated = saveSettings(body)
  return NextResponse.json(updated)
}
