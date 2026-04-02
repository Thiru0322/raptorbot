import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import type { Bot } from '@/lib/types'

export default async function DashboardPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: workspace } = await supabase
    .from('workspaces')
    .select('*')
    .eq('owner_id', user.id)
    .single()

  const { data: bots } = await supabase
    .from('bots')
    .select('*')
    .eq('workspace_id', workspace?.id)
    .order('created_at', { ascending: false })

  return (
    <div className="p-10 max-w-5xl">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">My Bots</h1>
          <p className="text-sm text-gray-500 mt-1">
            {bots?.length ?? 0} bot{bots?.length !== 1 ? 's' : ''} in your workspace
          </p>
        </div>
        <Link href="/dashboard/bots/new" className="btn-primary">
          + New Bot
        </Link>
      </div>

      {!bots?.length ? (
        <div className="card p-16 text-center">
          <div className="text-5xl mb-4">🦖</div>
          <h2 className="text-lg font-medium mb-2">No bots yet</h2>
          <p className="text-sm text-gray-500 mb-6">
            Create your first AI chatbot and deploy it to any website in minutes.
          </p>
          <Link href="/dashboard/bots/new" className="btn-primary inline-block">
            Create your first bot
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {bots.map((bot: Bot) => (
            <Link key={bot.id} href={`/dashboard/bots/${bot.id}`}
              className="card p-5 hover:border-raptor-400/40 transition-all group block">
              <div className="flex items-start justify-between mb-4">
                <div className="w-11 h-11 rounded-xl flex items-center justify-center text-xl border"
                     style={{ background: bot.primary_color + '1a', borderColor: bot.primary_color + '33' }}>
                  {bot.avatar}
                </div>
                <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                  bot.status === 'active'
                    ? 'bg-green-950/60 text-green-400 border border-green-900/40'
                    : 'bg-surface-3 text-gray-500 border border-surface-4'
                }`}>
                  {bot.status}
                </span>
              </div>
              <h3 className="font-semibold text-sm mb-1">{bot.name}</h3>
              <p className="text-xs text-gray-600 mb-4 capitalize">
                {bot.mode === 'hybrid' ? 'Hybrid (KB + Agentic)' : bot.mode === 'kb' ? 'Knowledge Base' : 'Agentic'}
                {' · '}{bot.llm_provider}
              </p>
              <div className="flex justify-between items-center pt-3 border-t border-surface-3">
                <span className="text-xs text-gray-700">
                  {new Date(bot.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </span>
                <span className="text-xs text-raptor-400 group-hover:text-raptor-300 transition-colors">
                  Configure →
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
