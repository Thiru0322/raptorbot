// LLM Router — unified interface for all supported providers

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
}

export interface LLMConfig {
  provider: 'anthropic' | 'openai' | 'gemini' | 'groq' | 'grok'
  apiKey: string
  model?: string
}

function normalizeGeminiModel(model?: string): string {
  const raw = (model || '').trim()
  if (!raw) return 'gemini-1.5-flash'
  return raw
    .replace(/^models\//, '')
    .replace(/^\/+/, '')
    .replace(/:streamGenerateContent.*$/i, '')
}

function geminiModelCandidates(model?: string): string[] {
  const preferred = normalizeGeminiModel(model)
  const fallbacks = ['gemini-2.0-flash', 'gemini-1.5-flash-latest', 'gemini-1.5-flash-8b']
  return [preferred, ...fallbacks.filter(m => m !== preferred)]
}

export async function streamChat(
  config: LLMConfig,
  systemPrompt: string,
  messages: ChatMessage[],
  onChunk: (text: string) => void,
  onDone: (fullText: string) => void,
  onError: (err: string) => void
) {
  try {
    switch (config.provider) {
      case 'anthropic':
        await anthropicStream(config, systemPrompt, messages, onChunk, onDone, onError)
        break
      case 'openai':
      case 'groq':
      case 'grok':
        await openAICompatStream(config, systemPrompt, messages, onChunk, onDone, onError)
        break
      case 'gemini':
        await geminiStream(config, systemPrompt, messages, onChunk, onDone, onError)
        break
      default:
        onError('Unsupported provider')
    }
  } catch (e: any) {
    onError(e.message || 'LLM error')
  }
}

// ---------- Anthropic ----------
async function anthropicStream(
  config: LLMConfig, system: string, messages: ChatMessage[],
  onChunk: (t: string) => void, onDone: (t: string) => void, onError: (e: string) => void
) {
  const model = config.model || 'claude-sonnet-4-20250514'
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': config.apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model,
      max_tokens: 1024,
      system,
      stream: true,
      messages: messages.filter(m => m.role !== 'system'),
    }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    onError(err?.error?.message || `Anthropic error ${res.status}`)
    return
  }
  let full = ''
  const reader = res.body!.getReader()
  const decoder = new TextDecoder()
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    const chunk = decoder.decode(value)
    for (const line of chunk.split('\n')) {
      if (!line.startsWith('data: ')) continue
      const data = line.slice(6)
      if (data === '[DONE]') continue
      try {
        const json = JSON.parse(data)
        const text = json?.delta?.text || ''
        if (text) { full += text; onChunk(text) }
      } catch {}
    }
  }
  onDone(full)
}

// ---------- OpenAI / Groq (compatible) ----------
async function openAICompatStream(
  config: LLMConfig, system: string, messages: ChatMessage[],
  onChunk: (t: string) => void, onDone: (t: string) => void, onError: (e: string) => void
) {
  const baseUrl =
    config.provider === 'groq'
      ? 'https://api.groq.com/openai/v1'
      : config.provider === 'grok'
        ? 'https://api.x.ai/v1'
        : 'https://api.openai.com/v1'

  const model =
    config.model ||
    (config.provider === 'groq'
      ? 'llama3-8b-8192'
      : config.provider === 'grok'
        ? 'grok-4-1-fast-non-reasoning'
        : 'gpt-4o-mini')

  const res = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify({
      model,
      stream: true,
      messages: [{ role: 'system', content: system }, ...messages],
    }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    onError(err?.error?.message || `${config.provider} error ${res.status}`)
    return
  }
  let full = ''
  const reader = res.body!.getReader()
  const decoder = new TextDecoder()
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    const chunk = decoder.decode(value)
    for (const line of chunk.split('\n')) {
      if (!line.startsWith('data: ')) continue
      const data = line.slice(6)
      if (data === '[DONE]') continue
      try {
        const json = JSON.parse(data)
        const text =
          json?.choices?.[0]?.delta?.content ??
          json?.choices?.[0]?.delta?.text ??
          json?.choices?.[0]?.text ??
          json?.delta?.content ??
          ''
        if (text) { full += text; onChunk(text) }
      } catch {}
    }
  }
  onDone(full)
}

// ---------- Google Gemini ----------
async function geminiStream(
  config: LLMConfig, system: string, messages: ChatMessage[],
  onChunk: (t: string) => void, onDone: (t: string) => void, onError: (e: string) => void
) {
  const geminiMessages = messages.map(m => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }],
  }))
  let res: Response | null = null
  let lastErr: any = null

  for (const model of geminiModelCandidates(config.model)) {
    const attempt = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?alt=sse&key=${config.apiKey}`,
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
    if (!msg.includes('not found')) {
      onError(msg)
      return
    }
  }

  if (!res) {
    onError(lastErr || 'No compatible Gemini model found for this API key.')
    return
  }
  let full = ''
  const reader = res.body!.getReader()
  const decoder = new TextDecoder()
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    const chunk = decoder.decode(value)
    for (const line of chunk.split('\n')) {
      if (!line.startsWith('data: ')) continue
      try {
        const json = JSON.parse(line.slice(6))
        const text = json?.candidates?.[0]?.content?.parts?.[0]?.text || ''
        if (text) { full += text; onChunk(text) }
      } catch {}
    }
  }
  onDone(full)
}
