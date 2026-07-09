import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth'
import { getSettings, saveSettings } from '@/lib/settings-store'

export async function GET(req: NextRequest) {
  const auth = await requireRole(req, 'viewer')
  if (auth instanceof NextResponse) return auth
  const s = getSettings()
  // Mask sensitive values for non-admins
  return NextResponse.json(s)
}

export async function POST(req: NextRequest) {
  const auth = await requireRole(req, 'admin')
  if (auth instanceof NextResponse) return auth
  const body = await req.json()
  const updated = saveSettings(body)
  return NextResponse.json(updated)
}
