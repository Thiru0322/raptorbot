import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function BillingPage({ searchParams }: { searchParams: { success?: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: workspace } = await supabase
    .from('workspaces').select('*').eq('owner_id', user.id).single()

  return (
    <div className="p-10 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight">Free Plan</h1>
        <p className="text-sm text-gray-500 mt-1">Payments are disabled right now. You’re on the free tier.</p>
      </div>

      {searchParams.success && (
        <div className="mb-6 px-4 py-3 rounded-xl border border-green-900/40 bg-green-950/30 text-sm text-green-400">
          ✓ Thanks! Billing is currently turned off (free tier only).
        </div>
      )}

      <div className="card p-6">
        <p className="text-sm text-gray-400 leading-relaxed">
          Check back later when billing is enabled.
        </p>
      </div>
    </div>
  )
}
