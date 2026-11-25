import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth'
import { getCopilotUsageSummary } from '@/lib/copilot-usage'

export async function GET(req: NextRequest) {
  const auth = await requireRole(req, 'viewer')
  if (auth instanceof NextResponse) return auth
  return NextResponse.json(getCopilotUsageSummary())
}
