'use client'
import { useState } from 'react'
import type { Bot } from '@/lib/types'

export default function KnowledgeForm({ bot }: { bot: Bot }) {
  const [instructions, setInstructions] = useState(bot.system_instructions)
  const [kb, setKb] = useState(bot.knowledge_base)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  async function save() {
    setSaving(true)
    setError('')
    const res = await fetch(`/api/bots/${bot.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ system_instructions: instructions, knowledge_base: kb }),
    })
    const data = await res.json()
    if (!res.ok) setError(data.error || 'Save failed')
    else { setSaved(true); setTimeout(() => setSaved(false), 2500) }
    setSaving(false)
  }

  const wordCount = kb.split(/\s+/).filter(Boolean).length

  return (
    <div className="space-y-6">
      <div className="card p-6">
        <h3 className="label mb-2">System Instructions</h3>
        <p className="text-xs text-gray-600 mb-4">
          Define the bot's persona, tone, escalation rules, and hard limits. This runs before every conversation.
        </p>
        <textarea
          value={instructions}
          onChange={e => setInstructions(e.target.value)}
          rows={7}
          placeholder="You are a helpful support assistant for Acme Corp. Always be polite and concise. If you cannot resolve an issue in 3 messages, offer to connect the user with a human agent..."
          className="input resize-y leading-relaxed font-mono text-[13px]"
        />
        <p className="text-xs text-gray-700 mt-2">{instructions.length} characters</p>
      </div>

      <div className="card p-6">
        <div className="flex items-start justify-between mb-2">
          <div>
            <h3 className="label">Knowledge Base</h3>
            <p className="text-xs text-gray-600 mt-1">
              Write in Markdown. Use headers, Q&A pairs, tables — anything your bot should know.
            </p>
          </div>
          <div className="text-right text-xs text-gray-600">
            <div>{kb.length.toLocaleString()} chars</div>
            <div>{wordCount.toLocaleString()} words</div>
          </div>
        </div>

        <textarea
          value={kb}
          onChange={e => setKb(e.target.value)}
          rows={20}
          placeholder={`## Frequently Asked Questions\n\n**Q: How do I reset my password?**\nA: Go to Settings → Security → Reset Password.\n\n**Q: What plans do you offer?**\nA: Free, Pro ($29/mo), and Enterprise.\n\n## Policies\n\n...`}
          className="input resize-y leading-relaxed font-mono text-[13px]"
        />

        <div className="flex items-center justify-between mt-3">
          <div className="flex gap-2">
            {[
              { label: 'FAQ Template', content: `## Frequently Asked Questions\n\n**Q: Question?**\nA: Answer.\n\n**Q: Another question?**\nA: Another answer.\n` },
              { label: 'Policy Template', content: `## Policies\n\n### Refund Policy\nWe offer full refunds within 30 days.\n\n### Privacy Policy\nWe do not sell user data.\n` },
            ].map(t => (
              <button key={t.label} onClick={() => setKb(prev => prev + '\n' + t.content)}
                className="text-xs border border-surface-3 text-gray-600 hover:text-gray-400 px-3 py-1.5 rounded-lg transition-colors">
                + {t.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <button onClick={save} disabled={saving} className="btn-primary min-w-[120px]">
          {saving ? 'Saving…' : saved ? '✓ Saved' : 'Save Changes'}
        </button>
        {error && <p className="text-sm text-red-400">{error}</p>}
        {saved && <p className="text-sm text-green-400">Knowledge base saved</p>}
      </div>
    </div>
  )
}
