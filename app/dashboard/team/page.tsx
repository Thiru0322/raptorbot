import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import TeamPanel from '@/components/team/TeamPanel'

export default async function TeamPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: workspace } = await supabase
    .from('workspaces').select('*').eq('owner_id', user.id).single()

  const { data: members } = await supabase
    .from('team_members')
    .select('*')
    .eq('workspace_id', workspace?.id)
    .order('created_at')

  return (
    <div className="p-10 max-w-3xl">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight">Team</h1>
        <p className="text-sm text-gray-500 mt-1">Manage workspace members and permissions</p>
      </div>
      <TeamPanel workspace={workspace} members={members ?? []} currentUserId={user.id} currentUserEmail={user.email ?? ''} />
    </div>
  )
}
