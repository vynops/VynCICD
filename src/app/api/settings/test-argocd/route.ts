import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth'
import { testArgoCdConnection } from '@/lib/argocd'

export async function POST(req: NextRequest) {
  const auth = await requireRole(req, 'admin')
  if (auth instanceof NextResponse) return auth
  try {
    const version = await testArgoCdConnection()
    return NextResponse.json({ success: true, message: `Connected to Argo CD · ${version}` })
  } catch (error) {
    return NextResponse.json({ success: false, message: error instanceof Error ? error.message : 'Argo CD connection failed.' })
  }
}
