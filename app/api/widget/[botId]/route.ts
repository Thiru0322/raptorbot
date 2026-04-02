import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { decrypt } from '@/lib/crypto'
import { getLastUserText, selectRelevantKnowledgeBase } from '@/lib/kb'

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

// Use service role to bypass RLS for widget requests (public traffic)
function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  })
}

export async function POST(req: NextRequest, { params }: { params: { botId: string } }) {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  }

  try {
    const body = await req.json()
    const { messages, sessionId, visitorId, userContext } = body

    // Load bot via widget_token (public auth)
    const supabase = adminClient()
    const { data: bot } = await supabase
      .from('bots')
      .select('*')
      .eq('widget_token', params.botId)
      .eq('status', 'active')
      .single()

    if (!bot) {
      return NextResponse.json({ error: 'Bot not found or inactive' }, { status: 404, headers: corsHeaders })
    }

    // Check allowed origins
    if (bot.allowed_origins?.length > 0) {
      const origin = req.headers.get('origin') || ''
      const allowed = bot.allowed_origins.some((o: string) => origin.includes(o))
      if (!allowed) {
        return NextResponse.json({ error: 'Origin not allowed' }, { status: 403, headers: corsHeaders })
      }
    }

    // Decrypt API key
    let apiKey = ''
    if (bot.llm_api_key_enc) {
      try { apiKey = await decrypt(bot.llm_api_key_enc) } catch {}
    }
    if (!apiKey) {
      return NextResponse.json({ error: 'Bot not configured' }, { status: 503, headers: corsHeaders })
    }

    // Build system prompt
    let systemPrompt = bot.system_instructions
    const lastUserText = getLastUserText(messages)

    if (bot.mode === 'kb') {
      systemPrompt += '\n\nYou MUST answer using ONLY the provided Knowledge Base snippets. If the answer is not present, respond with: "I do not know based on the provided Knowledge Base."'
    } else if (bot.mode === 'hybrid') {
      systemPrompt += '\n\nUse the provided Knowledge Base snippets as your primary source. If the answer is not present, you may answer using general knowledge, but clearly mark any assumptions.'
    }

    if (bot.knowledge_base) {
      const kbSnippet = selectRelevantKnowledgeBase(bot.knowledge_base, lastUserText, 6000)
      systemPrompt += `\n\n## Knowledge Base Snippets (authoritative)\n${kbSnippet}`
    }
    if ((bot.mode === 'agentic' || bot.mode === 'hybrid') && userContext) {
      const ctx = Object.entries(userContext)
        .map(([k, v]) => `${k}: ${v}`).join('\n')
      systemPrompt += `\n\n## User Context\n${ctx}`
    }

    // Ensure or create conversation
    let conversationId: string
    const { data: existing } = await supabase
      .from('conversations')
      .select('id')
      .eq('bot_id', bot.id)
      .eq('session_id', sessionId)
      .single()

    if (existing) {
      conversationId = existing.id
      await supabase.from('conversations')
        .update({ last_message_at: new Date().toISOString() })
        .eq('id', conversationId)
    } else {
      const { data: newConv } = await supabase.from('conversations')
        .insert({ bot_id: bot.id, session_id: sessionId, visitor_id: visitorId })
        .select('id').single()
      conversationId = newConv!.id
    }

    // Save user message
    const userMsg = messages[messages.length - 1]
    await supabase.from('messages').insert({
      conversation_id: conversationId,
      bot_id: bot.id,
      role: 'user',
      content: userMsg.content,
    })

    // Stream response from LLM
    const encoder = new TextEncoder()
    let fullResponse = ''

    const stream = new ReadableStream({
      async start(controller) {
        const send = (text: string) => {
          fullResponse += text
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text })}\n\n`))
        }

        try {
          await callLLM(bot.llm_provider, apiKey, bot.llm_model, systemPrompt, messages, send)
        } catch (e: any) {
          // Don't leak provider/model internals to the end user.
          console.error('LLM stream error:', e)
          send('Sorry, something went wrong. Please try again.')
        }

        // Save assistant message
        await supabase.from('messages').insert({
          conversation_id: conversationId,
          bot_id: bot.id,
          role: 'assistant',
          content: fullResponse,
        })

        // Update analytics
        const today = new Date().toISOString().slice(0, 10)
        try {
          await supabase.rpc('upsert_analytics', {
            p_bot_id: bot.id,
            p_date: today,
          })
        } catch {
          // Analytics failures shouldn't break chat.
        }

        controller.enqueue(encoder.encode('data: [DONE]\n\n'))
        controller.close()
      }
    })

    return new Response(stream, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500, headers: corsHeaders })
  }
}

async function callLLM(
  provider: string,
  apiKey: string,
  model: string | null,
  system: string,
  messages: any[],
  onChunk: (text: string) => void
) {
  switch (provider) {
    case 'anthropic': {
      const m = model || 'claude-sonnet-4-20250514'
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({ model: m, max_tokens: 1024, system, stream: true,
          messages: messages.filter((m: any) => m.role !== 'system') }),
      })
      await streamAnthropicResponse(res, onChunk)
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
        body: JSON.stringify({ model: m, stream: true,
          messages: [{ role: 'system', content: system }, ...messages] }),
      })
      await streamOpenAIResponse(res, onChunk)
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
    default:
      throw new Error(`Unsupported provider: ${provider}`)
  }
}

async function streamAnthropicResponse(res: Response, onChunk: (t: string) => void) {
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err?.error?.message || `Anthropic error ${res.status}`)
  }
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
        const text = json?.delta?.text || ''
        if (text) onChunk(text)
      } catch {}
    }
  }
}

async function streamOpenAIResponse(res: Response, onChunk: (t: string) => void) {
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err?.error?.message || `API error ${res.status}`)
  }
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
        const text =
          json?.choices?.[0]?.delta?.content ??
          json?.choices?.[0]?.delta?.text ??
          json?.choices?.[0]?.text ??
          json?.delta?.content ??
          json?.delta?.text ??
          ''
        if (text) onChunk(text)
      } catch {}
    }
  }
}

async function streamGeminiResponse(res: Response, onChunk: (t: string) => void) {
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err?.error?.message || `Gemini error ${res.status}`)
  }
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
        const text =
          (Array.isArray(parts)
            ? parts
              .map((p: any) => (typeof p === 'string' ? p : p?.text))
              .filter(Boolean)
              .join('')
            : json?.candidates?.[0]?.content?.parts?.[0]?.text) || ''
        if (text) onChunk(text)
      } catch {}
    }
  }
}
