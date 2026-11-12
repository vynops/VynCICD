import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth'

export async function POST(req: NextRequest) {
  const auth = await requireRole(req, 'editor')
  if (auth instanceof NextResponse) return auth
  return NextResponse.json({ error: 'Rollback execution is not configured; no rollback was performed.' }, { status: 501 })
}
