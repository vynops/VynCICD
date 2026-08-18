import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth'
import { getSettings } from '@/lib/settings-store'

interface TestResponse {
  success: boolean
  message: string
}

const CONFIGURED_MASK = '***configured***'

export async function POST(req: NextRequest) {
  const auth = await requireRole(req, 'admin')
  if (auth instanceof NextResponse) return auth

  try {
    const body = await req.json() as {
      provider?: 'groq' | 'openai' | 'anthropic' | 'google' | 'custom'
      apiKey?: string
      model?: string
      baseUrl?: string
    }

    const settings = getSettings()
    const provider = body.provider ?? settings.aiProvider ?? 'groq'
    const model = body.model ?? settings.aiModel ?? 'llama-3.3-70b-versatile'
    const requestedApiKey = (body.apiKey || '').trim()
    const apiKey = (requestedApiKey && requestedApiKey !== CONFIGURED_MASK)
      ? requestedApiKey
      : (provider === 'groq'
          ? (settings.groqApiKey || settings.aiApiKey || process.env.GROQ_API_KEY || '')
          : (settings.aiApiKey || ''))

    if (!apiKey) {
      return NextResponse.json<TestResponse>({ success: false, message: `Missing API key for ${provider}.` }, { status: 400 })
    }

    if (provider === 'custom') {
      const baseUrl = (body.baseUrl || settings.aiBaseUrl || '').trim()
      if (!baseUrl) return NextResponse.json<TestResponse>({ success: false, message: 'Custom provider requires a base URL.' }, { status: 400 })
      const ok = await testCustom(apiKey, baseUrl)
      return NextResponse.json<TestResponse>({ success: ok, message: ok ? `Connected to custom endpoint (${model}).` : 'Custom endpoint test failed.' })
    }

    if (provider === 'groq') {
      const ok = await testBearer('https://api.groq.com/openai/v1/models', apiKey)
      return NextResponse.json<TestResponse>({ success: ok, message: ok ? `Connected to Groq (${model}).` : 'Groq API test failed.' })
    }

    if (provider === 'openai') {
      const ok = await testBearer('https://api.openai.com/v1/models', apiKey)
      return NextResponse.json<TestResponse>({ success: ok, message: ok ? `Connected to OpenAI (${model}).` : 'OpenAI API test failed.' })
    }

    if (provider === 'anthropic') {
      const ok = await testAnthropic(apiKey)
      return NextResponse.json<TestResponse>({ success: ok, message: ok ? `Connected to Anthropic (${model}).` : 'Anthropic API test failed.' })
    }

    if (provider === 'google') {
      const ok = await testGoogle(apiKey, model)
      return NextResponse.json<TestResponse>({ success: ok, message: ok ? `Connected to Google Gemini (${model}).` : 'Google Gemini API test failed.' })
    }

    return NextResponse.json<TestResponse>({ success: false, message: `Unsupported provider: ${provider}` }, { status: 400 })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return NextResponse.json<TestResponse>({ success: false, message: `Test failed: ${msg}` }, { status: 500 })
  }
}

async function testBearer(url: string, apiKey: string): Promise<boolean> {
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${apiKey}` },
    signal: AbortSignal.timeout(8000),
  })
  return res.ok
}

async function testAnthropic(apiKey: string): Promise<boolean> {
  const res = await fetch('https://api.anthropic.com/v1/models', {
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    signal: AbortSignal.timeout(8000),
  })
  return res.ok
}

async function testGoogle(apiKey: string, model: string): Promise<boolean> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ contents: [{ parts: [{ text: 'ping' }] }] }),
    signal: AbortSignal.timeout(8000),
  })
  return res.ok
}

async function testCustom(apiKey: string, baseUrl: string): Promise<boolean> {
  const clean = baseUrl.replace(/\/$/, '')
  const res = await fetch(`${clean}/models`, {
    headers: { Authorization: `Bearer ${apiKey}` },
    signal: AbortSignal.timeout(8000),
  })
  return res.ok
}
