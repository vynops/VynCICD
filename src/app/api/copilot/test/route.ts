import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth'
import { getSettings } from '@/lib/settings-store'
import { normalizeAnthropicModel } from '@/lib/anthropic-model'

interface TestResponse {
  success: boolean
  message: string
}

const CONFIGURED_MASK = '***configured***'
const GROQ_DEFAULT_MODEL = 'openai/gpt-oss-120b'
const RETIRED_GROQ_MODELS = new Set(['llama-3.3-70b-versatile', 'llama-3.1-8b-instant', 'mixtral-8x7b-32768', 'gemma2-9b-it'])

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
    const requestedModel = body.model ?? settings.aiModel
    const model = provider === 'groq' && (!requestedModel || RETIRED_GROQ_MODELS.has(requestedModel))
      ? GROQ_DEFAULT_MODEL
      : requestedModel ?? 'gpt-4o-mini'
    const requestedApiKey = (body.apiKey || '').trim()
    const apiKey = (requestedApiKey && requestedApiKey !== CONFIGURED_MASK)
      ? requestedApiKey
      : (provider === 'groq'
          ? (settings.aiApiKey || settings.groqApiKey || process.env.GROQ_API_KEY || '')
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
      const anthropicModel = normalizeAnthropicModel(requestedModel)
      if (!anthropicModel || anthropicModel === '.' || anthropicModel === '..') {
        return NextResponse.json<TestResponse>({ success: false, message: 'Enter an Anthropic model ID, such as claude-sonnet-5-5.' }, { status: 400 })
      }

      const res = await testAnthropic(apiKey, anthropicModel)
      const message = res.ok
        ? `Anthropic model ${anthropicModel} is available.`
        : res.status === 404
          ? `Anthropic model ${anthropicModel} was not found or is unavailable to this API key. Enter the exact model ID (e.g. claude-sonnet-5-5).`
          : `Anthropic model lookup failed (HTTP ${res.status}).`
      return NextResponse.json<TestResponse>({ success: res.ok, message })
    }

    if (provider === 'google') {
      const res = await testGoogle(apiKey, model)
      const failures: Record<number, string> = {
        400: 'Invalid request or API key. Verify the Gemini key and model ID.',
        401: 'Authentication failed. Verify the Gemini API key.',
        403: 'Access denied. Check API key restrictions and Gemini API access.',
        404: `Model ${model} was not found or is unavailable to this API key. Check the exact model ID.`,
        429: 'Quota or rate limit exceeded. Check your Gemini quota and billing, then retry.',
        500: 'Google encountered an internal service error. Retry later.',
        503: 'Google Gemini is unavailable or overloaded. Retry later.',
        504: 'Google Gemini exceeded its response deadline. Retry later.',
      }
      const message = res.ok
        ? `Connected to Google Gemini (${model}).`
        : `Google Gemini test failed (HTTP ${res.status}). ${failures[res.status] ?? 'Check Gemini API availability and your provider configuration.'}`
      return NextResponse.json<TestResponse>({ success: res.ok, message })
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

async function testAnthropic(apiKey: string, model: string): Promise<Response> {
  return fetch(`https://api.anthropic.com/v1/models/${encodeURIComponent(model)}`, {
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    signal: AbortSignal.timeout(8000),
  })
}

async function testGoogle(apiKey: string, model: string): Promise<Response> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`
  try {
    return await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [{ text: 'ping' }] }] }),
      signal: AbortSignal.timeout(8000),
    })
  } catch (e) {
    if (e instanceof Error && e.name === 'TimeoutError') {
      throw new Error('Google Gemini request timed out after 8 seconds. Retry later.')
    }
    throw e
  }
}

async function testCustom(apiKey: string, baseUrl: string): Promise<boolean> {
  const clean = baseUrl.replace(/\/$/, '')
  const res = await fetch(`${clean}/models`, {
    headers: { Authorization: `Bearer ${apiKey}` },
    signal: AbortSignal.timeout(8000),
  })
  return res.ok
}
