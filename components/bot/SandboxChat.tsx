'use client'
import { useState, useRef, useEffect } from 'react'
import type { Bot } from '@/lib/types'

interface Msg {
  role: 'user' | 'assistant'
  content: string
  streaming?: boolean
}

export default function SandboxChat({ bot }: { bot: Bot }) {
  const [messages, setMessages] = useState<Msg[]>([
    { role: 'assistant', content: bot.welcome_message }
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function send() {
    const text = input.trim()
    if (!text || loading) return

    const userMsg: Msg = { role: 'user', content: text }
    setMessages(prev => [...prev, userMsg])
    setInput('')
    setLoading(true)

    const history = [...messages, userMsg]
      .filter(m => !m.streaming)
      .map(m => ({ role: m.role, content: m.content }))

    setMessages(prev => [...prev, { role: 'assistant', content: '', streaming: true }])

    try {
      const res = await fetch(`/api/sandbox/${bot.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: history }),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: `Server error ${res.status}` }))
        throw new Error(err.error || `Error ${res.status}`)
      }

      const reader = res.body!.getReader()
      const decoder = new TextDecoder()
      let full = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        for (const line of decoder.decode(value).split('\n')) {
          if (!line.startsWith('data: ')) continue
          const data = line.slice(6)
          if (data === '[DONE]') continue
          try {
            const parsed = JSON.parse(data)
            if (parsed.error) throw new Error(parsed.error)
            if (parsed.text) {
              full += parsed.text
              setMessages(prev => prev.map((m, i) =>
                i === prev.length - 1 ? { ...m, content: full } : m
              ))
            }
          } catch (e: any) {
            if (e.message && !e.message.includes('JSON')) throw e
          }
        }
      }

      setMessages(prev => prev.map((m, i) =>
        i === prev.length - 1 ? { ...m, streaming: false, content: full || '(no response)' } : m
      ))
    } catch (e: any) {
      setMessages(prev => prev.map((m, i) =>
        i === prev.length - 1
          ? { ...m, streaming: false, content: `Error: ${e.message}` }
          : m
      ))
    }

    setLoading(false)
    inputRef.current?.focus()
  }

  const hasKey = !!bot.llm_api_key_enc

  return (
    <div className="flex gap-8 max-w-4xl">
      <div className="flex-1 card overflow-hidden flex flex-col" style={{ height: 540 }}>
        <div className="px-4 py-3 border-b border-surface-3 flex items-center gap-3 bg-surface-2 shrink-0">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center text-base border"
               style={{ background: bot.primary_color + '1a', borderColor: bot.primary_color + '33' }}>
            {bot.avatar}
          </div>
          <div>
            <p className="text-sm font-semibold">{bot.name}</p>
            <p className="text-[11px] text-green-400 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 inline-block" />Online
            </p>
          </div>
          <button onClick={() => setMessages([{ role: 'assistant', content: bot.welcome_message }])}
            className="ml-auto text-xs border border-surface-3 text-gray-600 hover:text-gray-400 px-3 py-1.5 rounded-lg transition-colors">
            Reset
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
          {messages.map((m, i) => (
            <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'} items-end gap-2`}>
              {m.role === 'assistant' && (
                <div className="w-7 h-7 rounded-md flex items-center justify-center text-sm shrink-0 border"
                     style={{ background: bot.primary_color + '1a', borderColor: bot.primary_color + '33' }}>
                  {bot.avatar}
                </div>
              )}
              <div className={`max-w-[72%] px-3.5 py-2.5 rounded-xl text-sm leading-relaxed whitespace-pre-wrap ${
                m.role === 'user' ? 'text-white rounded-br-sm' : 'rounded-bl-sm'
              }`}
                style={m.role === 'user'
                  ? { background: bot.primary_color }
                  : { background: bot.bubble_color, color: bot.text_color }}>
                {m.content}
                {m.streaming && (
                  <span className="inline-flex gap-0.5 ml-1">
                    {[0,1,2].map(d => (
                      <span key={d} className="w-1 h-1 rounded-full bg-current inline-block"
                        style={{ animation: `pulse-dot 1s ${d * 0.2}s infinite` }} />
                    ))}
                  </span>
                )}
              </div>
            </div>
          ))}
          <div ref={bottomRef} />
        </div>

        <div className="p-3 border-t border-surface-3 flex gap-2 shrink-0">
          <textarea ref={inputRef} value={input}
            onChange={e => { setInput(e.target.value); e.target.style.height = 'auto'; e.target.style.height = Math.min(e.target.scrollHeight, 96) + 'px' }}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }}
            placeholder={hasKey ? 'Type a message…' : 'Add an API key in Customize first…'}
            disabled={!hasKey} rows={1}
            className="flex-1 bg-surface-2 border border-surface-3 rounded-lg px-3 py-2.5 text-sm text-white placeholder-gray-700 outline-none focus:border-raptor-400/50 resize-none leading-relaxed transition-colors disabled:opacity-40"
          />
          <button onClick={send} disabled={loading || !input.trim() || !hasKey}
            className="w-9 h-9 rounded-lg flex items-center justify-center text-white text-base self-end shrink-0 disabled:opacity-40 transition-opacity"
            style={{ background: bot.primary_color }}>↑</button>
        </div>
      </div>

      <div className="w-52 shrink-0 space-y-3">
        <div className="card p-4">
          <p className="label mb-3">Config</p>
          <div className="space-y-2 text-xs">
            <div className="flex justify-between"><span className="text-gray-600">Mode</span><span className="text-gray-400 capitalize">{bot.mode}</span></div>
            <div className="flex justify-between"><span className="text-gray-600">LLM</span><span className="text-gray-400 capitalize">{bot.llm_provider}</span></div>
            <div className="flex justify-between"><span className="text-gray-600">API Key</span><span className={hasKey ? 'text-green-400' : 'text-red-400'}>{hasKey ? '✓ Set' : '✗ Missing'}</span></div>
            <div className="flex justify-between"><span className="text-gray-600">KB</span><span className="text-gray-400">{(bot.knowledge_base || '').length.toLocaleString()} chars</span></div>
          </div>
        </div>

        {!hasKey && (
          <div className="rounded-xl border border-amber-900/40 bg-amber-950/30 p-4">
            <p className="text-xs font-medium text-amber-400 mb-1.5">API key missing</p>
            <p className="text-xs text-amber-900/80 leading-relaxed">Go to <strong>Customize</strong> → select your provider (Grok/Gemini/etc) → paste your key → Save.</p>
          </div>
        )}

        <div className="card p-4">
          <p className="label mb-3">Quick Prompts</p>
          <div className="space-y-1.5">
            {['Hello, what can you help with?', 'What are your pricing plans?', 'How do I get started?'].map(q => (
              <button key={q} onClick={() => setInput(q)}
                className="w-full text-left text-xs text-gray-600 hover:text-gray-400 border border-surface-3 hover:border-surface-4 rounded-lg p-2.5 leading-snug transition-colors">
                {q}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
