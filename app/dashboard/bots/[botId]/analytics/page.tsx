import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import AnalyticsView from '@/components/bot/AnalyticsView'

export default async function AnalyticsPage({ params }: { params: { botId: string } }) {
  const supabase = createClient()
  const { data: bot } = await supabase
    .from('bots').select('*').eq('id', params.botId).single()
  if (!bot) notFound()

  const { data: analytics } = await supabase
    .from('analytics_daily')
    .select('*')
    .eq('bot_id', params.botId)
    .order('date', { ascending: true })
    .limit(30)

  const { data: recentMessages } = await supabase
    .from('messages')
    .select('content, role, created_at')
    .eq('bot_id', params.botId)
    .eq('role', 'user')
    .order('created_at', { ascending: false })
    .limit(20)

  return (
    <div className="p-8 max-w-4xl">
      <div className="mb-7">
        <h2 className="text-xl font-semibold tracking-tight">Analytics</h2>
        <p className="text-sm text-gray-500 mt-1">Message volume and resolution trends</p>
      </div>
      <AnalyticsView analytics={analytics ?? []} recentMessages={recentMessages ?? []} />
    </div>
  )
}
