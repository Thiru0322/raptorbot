import { createClient } from '@/lib/supabase/server'
import { decrypt } from '@/lib/crypto'
import { getLastUserText, selectRelevantKnowledgeBase } from '@/lib/kb'
import { NextRequest, NextResponse } from 'next/server'

function normalizeGeminiModel(model: string | null): string {
  const raw = (model || '').trim()
  if (!raw) return 'gemini-1.5-flash'
  return raw
    .replace(/^models\//, '')
    .replace(/^\/+/, '')
    .replace(/:streamGenerateContent.*$/i, '')
}

function geminiModelCandidates(model: string | null): string[] {
  const preferred = normalizeGeminiModel(model)
  const fallbacks = ['gemini-2.0-flash', 'gemini-1.5-flash-latest', 'gemini-1.5-flash-8b']
  return [preferred, ...fallbacks.filter(m => m !== preferred)]
}

export async function POST(req: NextRequest, { params }: { params: { botId: string } }) {
  const supabase = createClient()

  // Auth check
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Load bot and verify ownership
  const { data: bot } = await supabase
    .from('bots')
    .select('*, workspaces!inner(owner_id)')
    .eq('id', params.botId)
    .single()

  if (!bot || bot.workspaces.owner_id !== user.id) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  // Decrypt API key
  let apiKey = ''
  if (bot.llm_api_key_enc) {
    try {
      apiKey = await decrypt(bot.llm_api_key_enc)
    } catch (e) {
      return NextResponse.json({
        error: 'Failed to decrypt API key. Check that ENCRYPTION_KEY in .env.local is set correctly and matches what was used when the key was saved.'
      }, { status: 500 })
    }
  }

  if (!apiKey) {
    return NextResponse.json({
      error: 'No API key configured. Go to Customize and save your LLM API key first.'
    }, { status: 400 })
  }

  const { messages } = await req.json()

  // Build system prompt
  let system = bot.system_instructions || 'You are a helpful assistant.'
  const lastUserText = getLastUserText(messages)

  if (bot.mode === 'kb') {
    system += '\n\nYou MUST answer using ONLY the provided Knowledge Base snippets. If the answer is not present, respond with: "I do not know based on the provided Knowledge Base."'
  } else if (bot.mode === 'hybrid') {
    system += '\n\nUse the provided Knowledge Base snippets as your primary source. If the answer is not present, you may answer using general knowledge, but clearly mark any assumptions.'
  }

  if (bot.knowledge_base) {
    const kbSnippet = selectRelevantKnowledgeBase(bot.knowledge_base, lastUserText, 6000)
    system += `\n\n## Knowledge Base Snippets (authoritative)\n${kbSnippet}`
  }

  // Stream from LLM
  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    async start(controller) {
      const send = (chunk: string) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text: chunk })}\n\n`))
      }

      try {
        await callLLM(bot.llm_provider, apiKey, bot.llm_model, system, messages, send)
      } catch (e: any) {
        // Don't leak provider/model internals to the client.
        console.error('LLM stream error:', e)
        send('Sorry, something went wrong. Please try again.')
      }

      controller.enqueue(encoder.encode('data: [DONE]\n\n'))
      controller.close()
    }
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    }
  })
}

async function callLLM(
  provider: string, apiKey: string, model: string | null,
  system: string, messages: any[], onChunk: (t: string) => void
) {
  switch (provider) {
    case 'anthropic': {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
        body: JSON.stringify({
          model: model || 'claude-sonnet-4-20250514',
          max_tokens: 1024, system, stream: true,
          messages: messages.filter((m: any) => m.role !== 'system'),
        }),
      })
      await streamAnthropicResponse(res, onChunk)
      break
    }
    case 'gemini': {
      const geminiMessages = messages.map((msg: any) => ({
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: msg.content }],
      }))

      let res: Response | null = null
      let lastErr = 'No compatible Gemini model found for this API key.'
      for (const m of geminiModelCandidates(model)) {
        const attempt = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${m}:streamGenerateContent?alt=sse&key=${apiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              system_instruction: { parts: [{ text: system }] },
              contents: geminiMessages,
            }),
          }
        )
        if (attempt.ok) {
          res = attempt
          break
        }
        const err = await attempt.json().catch(() => ({}))
        const msg = err?.error?.message || `Gemini error ${attempt.status}`
        lastErr = msg
        if (!msg.includes('not found')) throw new Error(msg)
      }
      if (!res) throw new Error(lastErr)

      await streamGeminiResponse(res, onChunk)
      break
    }
    case 'openai':
    case 'groq':
    case 'grok': {
      const baseUrl =
        provider === 'groq'
          ? 'https://api.groq.com/openai/v1'
          : provider === 'grok'
            ? 'https://api.x.ai/v1'
            : 'https://api.openai.com/v1'

      const m =
        model ||
        (provider === 'groq'
          ? 'llama3-8b-8192'
          : provider === 'grok'
            ? 'grok-4-1-fast-non-reasoning'
            : 'gpt-4o-mini')
      const res = await fetch(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
        body: JSON.stringify({ model: m, stream: true, messages: [{ role: 'system', content: system }, ...messages] }),
      })
      await streamOpenAIResponse(res, onChunk)
      break
    }
    default:
      throw new Error(`Unsupported provider: ${provider}`)
  }
}

async function streamAnthropicResponse(res: Response, onChunk: (t: string) => void) {
  if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e?.error?.message || `Anthropic error ${res.status}`) }
  const reader = res.body!.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() || ''
    for (const line of lines) {
      if (!line.startsWith('data: ')) continue
      try { const t = JSON.parse(line.slice(6))?.delta?.text || ''; if (t) onChunk(t) } catch {}
    }
  }
}

async function streamOpenAIResponse(res: Response, onChunk: (t: string) => void) {
  if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e?.error?.message || `API error ${res.status}`) }
  const reader = res.body!.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() || ''
    for (const line of lines) {
      if (!line.startsWith('data: ') || line.includes('[DONE]')) continue
      try {
        const json = JSON.parse(line.slice(6))
        const t =
          json?.choices?.[0]?.delta?.content ??
          json?.choices?.[0]?.delta?.text ??
          json?.choices?.[0]?.text ??
          json?.delta?.content ??
          json?.delta?.text ??
          ''
        if (t) onChunk(t)
      } catch {}
    }
  }
}

async function streamGeminiResponse(res: Response, onChunk: (t: string) => void) {
  if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e?.error?.message || `Gemini error ${res.status}`) }
  const reader = res.body!.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() || ''
    for (const line of lines) {
      if (!line.startsWith('data: ')) continue
      try {
        const json = JSON.parse(line.slice(6))
        const parts = json?.candidates?.[0]?.content?.parts
        const t =
          (Array.isArray(parts)
            ? parts
              .map((p: any) => (typeof p === 'string' ? p : p?.text))
              .filter(Boolean)
              .join('')
            : json?.candidates?.[0]?.content?.parts?.[0]?.text) || ''
        if (t) onChunk(t)
      } catch {}
    }
  }
}
