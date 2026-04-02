'use client'
import { useState } from 'react'
import type { Bot } from '@/lib/types'

interface Props { bot: Bot }

const PROVIDERS = [
  { id: 'anthropic', label: 'Anthropic', hint: 'Claude models' },
  { id: 'openai',    label: 'OpenAI',    hint: 'GPT models' },
  { id: 'gemini',    label: 'Gemini',    hint: 'Google AI' },
  { id: 'groq',      label: 'Groq',      hint: 'Fast inference' },
  { id: 'grok',      label: 'Grok (xAI)', hint: 'xAI Grok assistant' },
]

const MODES = [
  { id: 'kb',      label: 'Knowledge Base Only', desc: 'Deterministic — answers strictly from your KB content' },
  { id: 'agentic', label: 'Agentic Only',         desc: 'Dynamic — uses touchpoints from your user database' },
  { id: 'hybrid',  label: 'Hybrid (Recommended)', desc: 'KB for FAQs, agentic for user-specific queries' },
]

const TOUCHPOINTS = ['name','email','plan','last_login','usage_count','support_tickets','company','role']
const POSITIONS = ['bottom-right','bottom-left','top-right','top-left']

export default function CustomizeForm({ bot }: Props) {
  const [form, setForm] = useState({
    name: bot.name,
    avatar: bot.avatar,
    welcome_message: bot.welcome_message,
    llm_provider: bot.llm_provider,
    llm_api_key: '',
    llm_model: bot.llm_model || '',
    mode: bot.mode,
    touchpoints: bot.touchpoints || [],
    primary_color: bot.primary_color,
    bubble_color: bot.bubble_color,
    position: bot.position,
    status: bot.status,
  })
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  const set = (k: string, v: any) => setForm(prev => ({ ...prev, [k]: v }))

  const toggleTP = (tp: string) => {
    set('touchpoints', form.touchpoints.includes(tp)
      ? form.touchpoints.filter(x => x !== tp)
      : [...form.touchpoints, tp])
  }

  async function save() {
    setSaving(true)
    setError('')
    const payload: any = { ...form }
    if (!payload.llm_api_key) delete payload.llm_api_key

    const res = await fetch(`/api/bots/${bot.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    const data = await res.json()
    if (!res.ok) setError(data.error || 'Save failed')
    else { setSaved(true); setTimeout(() => setSaved(false), 2500) }
    setSaving(false)
  }

  return (
    <div className="space-y-6">

      {/* Identity */}
      <Section title="Identity">
        <Field label="Bot Name">
          <input value={form.name} onChange={e => set('name', e.target.value)} className="input" />
        </Field>
        <Field label="Avatar Emoji">
          <input value={form.avatar} onChange={e => set('avatar', e.target.value)} className="input w-20" />
        </Field>
        <Field label="Welcome Message">
          <textarea value={form.welcome_message} onChange={e => set('welcome_message', e.target.value)}
            rows={2} className="input resize-y leading-relaxed" />
        </Field>
        <Field label="Status">
          <select value={form.status} onChange={e => set('status', e.target.value)} className="input w-auto">
            <option value="inactive">Inactive</option>
            <option value="active">Active</option>
          </select>
        </Field>
      </Section>

      {/* LLM */}
      <Section title="LLM Provider">
        <div className="grid grid-cols-4 gap-2.5 mb-4">
          {PROVIDERS.map(p => (
            <button key={p.id} onClick={() => set('llm_provider', p.id)}
              className={`py-3 rounded-xl border text-sm transition-all ${
                form.llm_provider === p.id
                  ? 'border-raptor-400/60 bg-raptor-900/30 text-raptor-300 font-medium'
                  : 'border-surface-3 text-gray-600 hover:border-surface-4 hover:text-gray-400'
              }`}>
              <div>{p.label}</div>
              <div className="text-[10px] mt-0.5 opacity-60">{p.hint}</div>
            </button>
          ))}
        </div>
        <Field label="API Key">
          <input type="password" value={form.llm_api_key}
            onChange={e => set('llm_api_key', e.target.value)}
            placeholder={bot.llm_api_key_enc ? '••••••••••••• (saved — enter new key to change)' : `Enter your ${form.llm_provider} API key`}
            className="input" />
        </Field>
        <Field label="Model Override" hint="Leave blank to use default">
          <input value={form.llm_model} onChange={e => set('llm_model', e.target.value)}
            placeholder={
              form.llm_provider === 'anthropic' ? 'e.g. claude-opus-4-5' :
              form.llm_provider === 'openai' ? 'e.g. gpt-4o' :
              form.llm_provider === 'gemini' ? 'e.g. gemini-1.5-pro' :
              form.llm_provider === 'grok' ? 'e.g. grok-4-1-fast-non-reasoning' : 'e.g. llama3-70b-8192'
            }
            className="input" />
        </Field>
        <p className="text-xs text-gray-700 mt-2">
          Your API key is AES-256 encrypted at rest. We never log or share it.
        </p>
      </Section>

      {/* Mode */}
      <Section title="Bot Mode">
        <div className="space-y-2 mb-4">
          {MODES.map(m => (
            <div key={m.id} onClick={() => set('mode', m.id)}
              className={`flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition-all ${
                form.mode === m.id
                  ? 'border-raptor-400/50 bg-raptor-900/20'
                  : 'border-surface-3 hover:border-surface-4'
              }`}>
              <div className={`w-4 h-4 rounded-full border-2 mt-0.5 shrink-0 flex items-center justify-center transition-colors ${
                form.mode === m.id ? 'border-raptor-400 bg-raptor-400' : 'border-gray-600'
              }`}>
                {form.mode === m.id && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
              </div>
              <div>
                <p className="text-sm font-medium mb-0.5">{m.label}</p>
                <p className="text-xs text-gray-600">{m.desc}</p>
              </div>
            </div>
          ))}
        </div>

        {(form.mode === 'agentic' || form.mode === 'hybrid') && (
          <div className="mt-2">
            <p className="text-xs text-gray-500 mb-2.5">User touchpoints — fields fetched from your database per conversation</p>
            <div className="flex flex-wrap gap-2">
              {TOUCHPOINTS.map(tp => (
                <button key={tp} onClick={() => toggleTP(tp)}
                  className={`px-3 py-1.5 rounded-full text-xs border transition-all ${
                    form.touchpoints.includes(tp)
                      ? 'border-teal-500/40 bg-teal-950/40 text-teal-400'
                      : 'border-surface-3 text-gray-600 hover:border-surface-4 hover:text-gray-400'
                  }`}>
                  {tp}
                </button>
              ))}
            </div>
          </div>
        )}
      </Section>

      {/* Appearance */}
      <Section title="Appearance">
        <Field label="Position">
          <select value={form.position} onChange={e => set('position', e.target.value)} className="input w-auto">
            {POSITIONS.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
        </Field>
        <Field label="Primary Color">
          <div className="flex items-center gap-3">
            <input type="color" value={form.primary_color} onChange={e => set('primary_color', e.target.value)}
              className="w-9 h-9 rounded-lg border border-surface-3 bg-transparent p-1 cursor-pointer" />
            <input value={form.primary_color} onChange={e => set('primary_color', e.target.value)} className="input w-32" />
            <div className="w-8 h-8 rounded-lg border border-surface-3 flex items-center justify-center text-lg"
                 style={{ background: form.primary_color + '22', borderColor: form.primary_color + '44' }}>
              {form.avatar}
            </div>
          </div>
        </Field>
        <Field label="Bot Bubble Color">
          <div className="flex items-center gap-3">
            <input type="color" value={form.bubble_color} onChange={e => set('bubble_color', e.target.value)}
              className="w-9 h-9 rounded-lg border border-surface-3 bg-transparent p-1 cursor-pointer" />
            <input value={form.bubble_color} onChange={e => set('bubble_color', e.target.value)} className="input w-32" />
          </div>
        </Field>
      </Section>

      {/* Save */}
      <div className="flex items-center gap-4">
        <button onClick={save} disabled={saving} className="btn-primary min-w-[120px]">
          {saving ? 'Saving…' : saved ? '✓ Saved' : 'Save Changes'}
        </button>
        {error && <p className="text-sm text-red-400">{error}</p>}
        {saved && <p className="text-sm text-green-400">Changes saved successfully</p>}
      </div>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="card p-6">
      <h3 className="label mb-5">{title}</h3>
      <div className="space-y-4">{children}</div>
    </div>
  )
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-5">
      <div className="w-36 shrink-0 pt-2.5">
        <p className="text-sm text-gray-500">{label}</p>
        {hint && <p className="text-xs text-gray-700 mt-0.5">{hint}</p>}
      </div>
      <div className="flex-1">{children}</div>
    </div>
  )
}
