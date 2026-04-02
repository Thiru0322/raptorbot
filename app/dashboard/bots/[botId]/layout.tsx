import { createClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import BotTabs from '@/components/layout/BotTabs'

export default async function BotLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: { botId: string }
}) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: bot } = await supabase
    .from('bots')
    .select('*, workspaces!inner(owner_id)')
    .eq('id', params.botId)
    .single()

  if (!bot || bot.workspaces.owner_id !== user.id) notFound()

  return (
    <div className="flex flex-col min-h-full">
      <BotTabs botId={params.botId} botName={bot.name} botAvatar={bot.avatar} />
      <div className="flex-1">
        {children}
      </div>
    </div>
  )
}
