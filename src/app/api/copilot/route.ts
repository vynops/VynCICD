import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth'
import { getSettings } from '@/lib/settings-store'
import { recordUsage } from '@/lib/copilot-usage'
import { loadRuns, loadDeployments, loadScans } from '@/lib/data-store'
import { loadIncidents } from '@/lib/oncall-store'

type ChatMsg = { role: 'user' | 'assistant'; content: string }
const GROQ_DEFAULT_MODEL = 'openai/gpt-oss-120b'
const RETIRED_GROQ_MODELS = new Set(['llama-3.3-70b-versatile', 'llama-3.1-8b-instant', 'mixtral-8x7b-32768', 'gemma2-9b-it'])

function buildSystemPrompt(): string {
  const runs        = loadRuns().slice(0, 20)
  const deployments = loadDeployments().slice(0, 10)
  const incidents   = loadIncidents().filter(i => i.status !== 'resolved').slice(0, 10)
  const scans       = loadScans().slice(0, 5)

  const recentFailed = runs.filter(r => r.status === 'failed').slice(0, 5)

  return `You are VynCICD AI Copilot — an expert CI/CD and DevOps assistant embedded in the VynCICD platform.
You help engineers understand pipeline failures, security issues, DORA metrics, and deployment health.

Current system context:
- Total pipeline runs (last 20): ${runs.length}, failed: ${runs.filter(r => r.status === 'failed').length}
- Active incidents: ${incidents.length}
- Recent deployments: ${deployments.length}
- Security scans: ${scans.length}

${recentFailed.length > 0 ? `\nRecent failures:\n${recentFailed.map(r => `- ${r.pipelineName} (${r.branch}): ${r.error ?? 'Unknown error'}\n  Stages: ${r.stages.map(s => `${s.name}=${s.status}`).join(', ')}`).join('\n')}` : ''}

${incidents.length > 0 ? `\nOpen incidents:\n${incidents.map(i => `- [${i.severity.toUpperCase()}] ${i.title} (${i.category})`).join('\n')}` : ''}

Answer concisely and technically. When suggesting fixes, provide concrete commands or YAML snippets.
For build failures, always look at the failing stage logs and commit message. For security, reference the CVE IDs.`
}

export async function POST(req: NextRequest) {
  const auth = await requireRole(req, 'viewer')
  if (auth instanceof NextResponse) return auth

  const { messages } = await req.json() as { messages: ChatMsg[] }
  if (!messages?.length) return NextResponse.json({ error: 'messages required' }, { status: 400 })

  const settings = getSettings()
  const provider = settings.aiProvider ?? 'groq'
  const apiKey = provider === 'groq'
    ? (settings.groqApiKey || settings.aiApiKey || process.env.GROQ_API_KEY)
    : settings.aiApiKey
  const configuredModel = settings.aiModel?.trim()
  const model = provider === 'groq' && (!configuredModel || RETIRED_GROQ_MODELS.has(configuredModel))
    ? GROQ_DEFAULT_MODEL
    : configuredModel || 'gpt-4o-mini'

  if (!apiKey) {
    return NextResponse.json({ answer: `AI Copilot requires an API key for ${provider}. Configure it in Settings -> AI Copilot.` })
  }

  try {
    const result = await callProvider({
      provider,
      apiKey,
      model,
      baseUrl: settings.aiBaseUrl,
      systemPrompt: buildSystemPrompt(),
      messages: messages.slice(-12),
    })

    if (result.usage) recordUsage(result.usage.promptTokens, result.usage.completionTokens)

    return NextResponse.json({ answer: result.answer || 'No response generated.' })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    console.error(`[copilot] ${provider} error:`, msg)
    return NextResponse.json({ error: `AI request failed for ${provider}: ${msg}` }, { status: 500 })
  }
}

async function callProvider(opts: {
  provider: 'groq' | 'openai' | 'anthropic' | 'google' | 'custom'
  apiKey: string
  model: string
  baseUrl?: string
  systemPrompt: string
  messages: ChatMsg[]
}): Promise<{ answer: string; usage?: { promptTokens: number; completionTokens: number } }> {
  if (opts.provider === 'google') return callGoogle(opts)
  if (opts.provider === 'anthropic') return callAnthropic(opts)
  if (opts.provider === 'custom') return callCustomOpenAi(opts)
  if (opts.provider === 'openai') return callOpenAiCompatible(opts, 'https://api.openai.com/v1')
  return callOpenAiCompatible(opts, 'https://api.groq.com/openai/v1')
}

async function callOpenAiCompatible(
  opts: {
    apiKey: string
    model: string
    systemPrompt: string
    messages: ChatMsg[]
  },
  baseUrl: string
): Promise<{ answer: string; usage?: { promptTokens: number; completionTokens: number } }> {
  const res = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${opts.apiKey}`,
    },
    body: JSON.stringify({
      model: opts.model,
      messages: [
        { role: 'system', content: opts.systemPrompt },
        ...opts.messages,
      ],
      temperature: 0.3,
      max_tokens: 1024,
    }),
  })

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`HTTP ${res.status}${text ? `: ${text}` : ''}`)
  }

  const data = await res.json() as {
    choices?: Array<{ message?: { content?: string } }>
    usage?: { prompt_tokens?: number; completion_tokens?: number }
  }

  return {
    answer: data.choices?.[0]?.message?.content ?? '',
    usage: {
      promptTokens: data.usage?.prompt_tokens ?? 0,
      completionTokens: data.usage?.completion_tokens ?? 0,
    },
  }
}

async function callCustomOpenAi(opts: {
  apiKey: string
  model: string
  baseUrl?: string
  systemPrompt: string
  messages: ChatMsg[]
}): Promise<{ answer: string; usage?: { promptTokens: number; completionTokens: number } }> {
  if (!opts.baseUrl) throw new Error('Custom provider requires base URL')
  const normalized = opts.baseUrl.replace(/\/$/, '')
  return callOpenAiCompatible({
    apiKey: opts.apiKey,
    model: opts.model,
    systemPrompt: opts.systemPrompt,
    messages: opts.messages,
  }, normalized)
}

async function callAnthropic(opts: {
  apiKey: string
  model: string
  systemPrompt: string
  messages: ChatMsg[]
}): Promise<{ answer: string; usage?: { promptTokens: number; completionTokens: number } }> {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': opts.apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: opts.model,
      max_tokens: 1024,
      temperature: 0.3,
      system: opts.systemPrompt,
      messages: opts.messages.map(m => ({ role: m.role, content: m.content })),
    }),
  })

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`HTTP ${res.status}${text ? `: ${text}` : ''}`)
  }

  const data = await res.json() as {
    content?: Array<{ type: string; text?: string }>
    usage?: { input_tokens?: number; output_tokens?: number }
  }

  const answer = (data.content ?? []).filter(c => c.type === 'text').map(c => c.text ?? '').join('\n').trim()
  return {
    answer,
    usage: {
      promptTokens: data.usage?.input_tokens ?? 0,
      completionTokens: data.usage?.output_tokens ?? 0,
    },
  }
}

async function callGoogle(opts: {
  apiKey: string
  model: string
  systemPrompt: string
  messages: ChatMsg[]
}): Promise<{ answer: string; usage?: { promptTokens: number; completionTokens: number } }> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(opts.model)}:generateContent?key=${encodeURIComponent(opts.apiKey)}`
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: opts.systemPrompt }] },
      contents: opts.messages.map(m => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }],
      })),
      generationConfig: {
        temperature: 0.3,
        maxOutputTokens: 1024,
      },
    }),
  })

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`HTTP ${res.status}${text ? `: ${text}` : ''}`)
  }

  const data = await res.json() as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>
    usageMetadata?: { promptTokenCount?: number; candidatesTokenCount?: number }
  }
  const answer = data.candidates?.[0]?.content?.parts?.map(p => p.text ?? '').join('\n').trim() ?? ''

  return {
    answer,
    usage: {
      promptTokens: data.usageMetadata?.promptTokenCount ?? 0,
      completionTokens: data.usageMetadata?.candidatesTokenCount ?? 0,
    },
  }
}
