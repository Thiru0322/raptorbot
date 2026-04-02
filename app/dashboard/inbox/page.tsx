import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import InboxView from '@/components/inbox/InboxView'

export default async function InboxPage({
  searchParams,
}: {
  searchParams: { botId?: string; status?: string; conversationId?: string }
}) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: workspace } = await supabase
    .from('workspaces').select('id, plan').eq('owner_id', user.id).single()

  if (!workspace) redirect('/dashboard')

  // Load bots for filter
  const { data: bots } = await supabase
    .from('bots').select('id, name, avatar')
    .eq('workspace_id', workspace.id)
    .order('created_at')

  // Load conversations
  const query = supabase
    .from('conversations')
    .select(`
      id, session_id, visitor_name, visitor_email, status,
      started_at, last_message_at, message_count, tags, handoff_requested_at,
      bots!inner(id, name, avatar, workspace_id)
    `)
    .eq('bots.workspace_id', workspace.id)
    .order('last_message_at', { ascending: false })
    .limit(50)

  if (searchParams.botId) query.eq('bot_id', searchParams.botId)
  if (searchParams.status) query.eq('status', searchParams.status)

  const { data: conversations } = await query

  // Load selected conversation messages
  let selectedMessages: any[] = []
  if (searchParams.conversationId) {
    const { data } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', searchParams.conversationId)
      .order('created_at')
    selectedMessages = data ?? []
  }

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Inbox</h1>
        <p className="text-sm text-gray-500 mt-1">All conversations across your bots</p>
      </div>
      <InboxView
        bots={bots ?? []}
        conversations={(conversations ?? []) as any}
        selectedMessages={selectedMessages}
        selectedConversationId={searchParams.conversationId}
        filters={{ botId: searchParams.botId, status: searchParams.status }}
      />
    </div>
  )
}
