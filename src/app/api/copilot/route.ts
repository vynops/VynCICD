import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth'
import { getSettings } from '@/lib/settings-store'
import { recordUsage } from '@/lib/copilot-usage'
import { loadRuns, loadDeployments, loadScans } from '@/lib/data-store'
import { loadIncidents } from '@/lib/oncall-store'
import Groq from 'groq-sdk'

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

  const { messages } = await req.json() as { messages: { role: 'user' | 'assistant'; content: string }[] }
  if (!messages?.length) return NextResponse.json({ error: 'messages required' }, { status: 400 })

  const settings = getSettings()
  const apiKey = settings.groqApiKey || process.env.GROQ_API_KEY
  if (!apiKey) {
    return NextResponse.json({ answer: 'AI Copilot requires a Groq API key. Please add it in Settings → AI Copilot. Get a free key at console.groq.com.' })
  }

  try {
    const groq = new Groq({ apiKey })
    const completion = await groq.chat.completions.create({
      model: settings.aiModel || 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: buildSystemPrompt() },
        ...messages.slice(-12), // last 12 messages for context
      ],
      max_tokens: 1024,
      temperature: 0.3,
    })

    const answer = completion.choices[0]?.message?.content ?? 'No response generated.'
    const usage = completion.usage
    if (usage) recordUsage(usage.prompt_tokens, usage.completion_tokens)

    return NextResponse.json({ answer })
  } catch (e) {
    console.error('[copilot] Groq error:', e)
    return NextResponse.json({ error: 'AI request failed. Check your API key in Settings.' }, { status: 500 })
  }
}
