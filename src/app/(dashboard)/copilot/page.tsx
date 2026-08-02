'use client'

import { useState, useRef, useEffect } from 'react'
import useSWR from 'swr'
import { Bot, Send, Loader2, User, RotateCcw, History, X } from 'lucide-react'
import { cn } from '@/lib/utils'

const fetcher = (url: string) => fetch(url).then(r => r.json())

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  ts: string
}

const PROMPTS = [
  'Why did the web-frontend build fail?',
  'Show me DORA metrics summary',
  'What are the top failing pipelines?',
  'How do I fix a flaky test in CI?',
  'Suggest optimisations for slow builds',
  'Explain the security vulnerabilities found',
]

const HISTORY_KEY = 'vyncicd_copilot_history'

export default function CopilotPage() {
  const { data: usage } = useSWR('/api/copilot/usage', fetcher, { refreshInterval: 30000 })
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput]       = useState('')
  const [loading, setLoading]   = useState(false)
  const [history, setHistory]   = useState<string[]>([])
  const bottomRef               = useRef<HTMLDivElement>(null)

  // Load history from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(HISTORY_KEY)
      if (saved) setHistory(JSON.parse(saved) as string[])
    } catch { /* ignore */ }
  }, [])

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  function addToHistory(q: string) {
    setHistory(prev => {
      const deduped = [q, ...prev.filter(h => h !== q)].slice(0, 30)
      try { localStorage.setItem(HISTORY_KEY, JSON.stringify(deduped)) } catch { /* ignore */ }
      return deduped
    })
  }

  function clearHistory() {
    setHistory([])
    try { localStorage.removeItem(HISTORY_KEY) } catch { /* ignore */ }
  }

  async function send(text?: string) {
    const q = (text ?? input).trim()
    if (!q || loading) return
    setInput('')
    addToHistory(q)
    const userMsg: Message = { id: crypto.randomUUID(), role: 'user', content: q, ts: new Date().toISOString() }
    setMessages(prev => [...prev, userMsg])
    setLoading(true)
    try {
      const res = await fetch('/api/copilot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: [...messages, userMsg].map(m => ({ role: m.role, content: m.content })) }),
      })
      const data = await res.json() as { answer?: string; error?: string }
      setMessages(prev => [...prev, {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: data.answer ?? data.error ?? 'No response.',
        ts: new Date().toISOString(),
      }])
    } catch {
      setMessages(prev => [...prev, { id: crypto.randomUUID(), role: 'assistant', content: 'Network error. Please try again.', ts: new Date().toISOString() }])
    }
    setLoading(false)
  }

  return (
    <div className="flex gap-4 h-[calc(100vh-7rem)] max-w-6xl mx-auto">

      {/* ── Left: existing chat column ── */}
      <div className="flex flex-col flex-1 min-w-0">
        {/* Usage bar */}
        {usage && (
          <div className="flex flex-wrap gap-4 text-[11px] text-slate-500 mb-3 px-1">
            <span>Today: <span className="text-white font-mono">{usage.today?.requests ?? 0}</span> requests</span>
            <span>Tokens: <span className="text-white font-mono">{(usage.today?.totalTokens ?? 0).toLocaleString()}</span></span>
            <span>7-day total: <span className="text-white font-mono">{(usage.total?.totalTokens ?? 0).toLocaleString()}</span> tokens</span>
          </div>
        )}

        {/* Chat window */}
        <div className="flex-1 bg-[#0d1117] border border-slate-800/60 rounded-xl overflow-y-auto p-4 space-y-4">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center">
                <Bot className="w-7 h-7 text-emerald-400" />
              </div>
              <div>
                <div className="text-sm font-semibold text-white mb-1">VynCICD AI Copilot</div>
                <div className="text-xs text-slate-500">Powered by Groq · Ask about pipeline failures, DORA metrics, security issues, and more.</div>
              </div>
            </div>
          )}
          {messages.map(msg => (
            <div key={msg.id} className={cn('flex gap-3', msg.role === 'user' ? 'justify-end' : 'justify-start')}>
              {msg.role === 'assistant' && (
                <div className="w-7 h-7 rounded-lg bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Bot className="w-3.5 h-3.5 text-emerald-400" />
                </div>
              )}
              <div className={cn(
                'max-w-[80%] rounded-2xl px-4 py-3 text-sm whitespace-pre-wrap',
                msg.role === 'user'
                  ? 'bg-emerald-500/20 text-emerald-100 border border-emerald-500/30'
                  : 'bg-slate-800/60 text-slate-200 border border-slate-700/40'
              )}>
                {msg.content}
              </div>
              {msg.role === 'user' && (
                <div className="w-7 h-7 rounded-lg bg-slate-700 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <User className="w-3.5 h-3.5 text-slate-400" />
                </div>
              )}
            </div>
          ))}
          {loading && (
            <div className="flex gap-3">
              <div className="w-7 h-7 rounded-lg bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center flex-shrink-0">
                <Bot className="w-3.5 h-3.5 text-emerald-400" />
              </div>
              <div className="bg-slate-800/60 border border-slate-700/40 rounded-2xl px-4 py-3 flex items-center gap-2">
                <Loader2 className="w-3.5 h-3.5 text-emerald-400 animate-spin" />
                <span className="text-sm text-slate-400">Thinking…</span>
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Suggested prompts — always visible */}
        <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {PROMPTS.map(p => (
            <button key={p} onClick={() => send(p)}
              className="text-xs text-left px-3 py-2.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:border-emerald-500/30 transition-colors">
              {p}
            </button>
          ))}
        </div>

        {/* Input */}
        <div className="mt-3 flex gap-2">
          {messages.length > 0 && (
            <button onClick={() => setMessages([])} title="Clear chat"
              className="w-10 h-10 flex items-center justify-center rounded-xl bg-[#0d1117] border border-slate-800 text-slate-500 hover:text-white transition-colors flex-shrink-0">
              <RotateCcw className="w-4 h-4" />
            </button>
          )}
          <div className="flex-1 flex gap-2 bg-[#0d1117] border border-slate-800 rounded-xl overflow-hidden focus-within:border-emerald-500/50 transition-colors">
            <input
              value={input} onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !e.shiftKey && send()}
              placeholder="Ask about your pipelines, failures, security…"
              disabled={loading}
              className="flex-1 px-4 py-3 bg-transparent text-sm text-white placeholder-slate-600 focus:outline-none disabled:opacity-50"
            />
            <button onClick={() => send()} disabled={loading || !input.trim()}
              className="px-4 py-3 text-slate-500 hover:text-emerald-400 disabled:opacity-30 transition-colors">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>

      {/* ── Right: prompt history panel ── */}
      <div className="hidden xl:flex flex-col w-56 flex-shrink-0">
        <div className="flex items-center justify-between mb-3 px-1">
          <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-500 uppercase tracking-widest">
            <History className="w-3.5 h-3.5" />
            History
          </div>
          {history.length > 0 && (
            <button onClick={clearHistory} title="Clear history"
              className="text-slate-600 hover:text-red-400 transition-colors">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
        <div className="flex-1 overflow-y-auto space-y-1 bg-[#0d1117] border border-slate-800/60 rounded-xl p-2">
          {history.length === 0 && (
            <p className="text-xs text-slate-600 text-center mt-4 px-2">Your past prompts will appear here.</p>
          )}
          {history.map((h, i) => (
            <button key={i} onClick={() => send(h)}
              className="w-full text-left px-3 py-2 rounded-lg text-xs text-slate-400 hover:text-white hover:bg-slate-800/60 transition-colors truncate block">
              {h}
            </button>
          ))}
        </div>
      </div>

    </div>
  )
}

