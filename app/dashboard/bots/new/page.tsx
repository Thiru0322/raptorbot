'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function NewBotPage() {
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const supabase = createClient()
  const router = useRouter()

  async function create(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    setLoading(true)
    setError('')

    const { data: workspace } = await supabase
      .from('workspaces').select('id').single()

    if (!workspace) { setError('No workspace found.'); setLoading(false); return }

    const { data: bot, error: err } = await supabase
      .from('bots')
      .insert({ name: name.trim(), workspace_id: workspace.id })
      .select()
      .single()

    if (err) { setError(err.message); setLoading(false); return }
    router.push(`/dashboard/bots/${bot.id}`)
  }

  return (
    <div className="p-10 max-w-lg">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight">New Bot</h1>
        <p className="text-sm text-gray-500 mt-1">Give your chatbot a name to get started</p>
      </div>

      <div className="card p-6">
        <form onSubmit={create} className="space-y-5">
          <div>
            <label className="label mb-2 block">Bot Name</label>
            <input value={name} onChange={e => setName(e.target.value)}
              placeholder="e.g. Support Bot, Sales Assistant…"
              className="input" autoFocus required />
          </div>
          {error && (
            <p className="text-xs text-red-400">{error}</p>
          )}
          <div className="flex gap-3">
            <button type="submit" disabled={loading || !name.trim()} className="btn-primary">
              {loading ? 'Creating…' : 'Create Bot'}
            </button>
            <button type="button" onClick={() => router.back()} className="btn-ghost">
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
