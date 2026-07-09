import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth'
import { loadEnvironments, saveEnvironments } from '@/lib/data-store'
import type { Environment, EnvType } from '@/lib/data-store'
import crypto from 'crypto'

export async function GET(req: NextRequest) {
  const auth = await requireRole(req, 'viewer')
  if (auth instanceof NextResponse) return auth
  const name = req.nextUrl.searchParams.get('name')
  const envs = loadEnvironments()
  return NextResponse.json(name ? envs.filter(e => e.name === name) : envs)
}

export async function POST(req: NextRequest) {
  const auth = await requireRole(req, 'admin')
  if (auth instanceof NextResponse) return auth
  const body = await req.json() as Omit<Environment, 'id' | 'createdAt' | 'variables'>
  const envs = loadEnvironments()
  const env: Environment = { ...body, id: crypto.randomUUID(), variables: {}, createdAt: new Date().toISOString() }
  envs.push(env)
  saveEnvironments(envs)
  return NextResponse.json(env, { status: 201 })
}
