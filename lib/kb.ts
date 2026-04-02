const STOP_WORDS = new Set([
  'the', 'a', 'an', 'and', 'or', 'but', 'if', 'then', 'else', 'to', 'of', 'in',
  'for', 'on', 'with', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
  'it', 'its', 'as', 'at', 'by', 'from', 'that', 'this', 'these', 'those',
  'you', 'your', 'yours', 'we', 'our', 'ours', 'they', 'their', 'them',
  'i', 'me', 'my', 'mine', 'can', 'could', 'should', 'would', 'may', 'might',
  'do', 'does', 'did', 'done', 'not', 'no', 'yes', 'what', 'which', 'who',
  'whom', 'when', 'where', 'why', 'how', 'please', 'help', 'about',
])

function tokenize(text: string): string[] {
  return (text.toLowerCase().match(/[a-z0-9]+/g) ?? [])
    .map(t => t.trim())
    .filter(t => t.length >= 3 && !STOP_WORDS.has(t))
}

export function getLastUserText(messages: Array<{ role?: string; content?: string }>): string {
  for (let i = messages.length - 1; i >= 0; i--) {
    const m = messages[i]
    if (m?.role === 'user' && typeof m.content === 'string' && m.content.trim()) {
      return m.content.trim()
    }
  }
  return ''
}

// Lightweight keyword-based snippet selection (no embeddings required).
// Goal: include only the most relevant KB paragraphs to reduce truncation and improve grounding.
export function selectRelevantKnowledgeBase(
  knowledgeBase: string,
  query: string,
  maxChars: number
): string {
  const kb = (knowledgeBase || '').trim()
  if (!kb) return ''
  if (kb.length <= maxChars) return kb

  const paragraphs = kb
    .split(/\n\s*\n/g)
    .map(p => p.trim())
    .filter(Boolean)

  if (!paragraphs.length) return kb.slice(0, maxChars)

  const tokens = tokenize(query)
  if (!tokens.length) {
    // If we don't know what the user asked, fall back to the beginning of the KB.
    return paragraphs.join('\n\n').slice(0, maxChars)
  }

  const scored = paragraphs.map((p, idx) => {
    const pLower = p.toLowerCase()
    let score = 0
    for (const t of tokens) {
      if (pLower.includes(t)) score += 1
    }
    return { idx, p, score }
  })

  // Prefer higher scoring paragraphs; keep stable by original order for ties.
  scored.sort((a, b) => (b.score - a.score) || (a.idx - b.idx))

  const picked: string[] = []
  let used = 0

  for (const s of scored) {
    if (s.score <= 0) continue
    const nextLen = s.p.length + (picked.length ? 2 : 0)
    if (used + nextLen > maxChars) continue
    picked.push(s.p)
    used += nextLen
  }

  if (!picked.length) {
    // If nothing scored, return the first chunk to avoid empty prompts.
    return paragraphs.join('\n\n').slice(0, maxChars)
  }

  return picked.join('\n\n').slice(0, maxChars)
}

