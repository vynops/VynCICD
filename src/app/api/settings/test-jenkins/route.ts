import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth'
import { testJenkinsConnection } from '@/lib/jenkins'

export async function POST(req: NextRequest) {
  const auth = await requireRole(req, 'admin')
  if (auth instanceof NextResponse) return auth
  try {
    const jenkins = await testJenkinsConnection()
    return NextResponse.json({ success: true, message: `Connected to ${jenkins.displayName} · ${jenkins.version}` })
  } catch (error) {
    return NextResponse.json({ success: false, message: error instanceof Error ? error.message : 'Jenkins connection failed.' })
  }
}