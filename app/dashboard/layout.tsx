import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Sidebar from '@/components/layout/Sidebar'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: workspace } = await supabase
    .from('workspaces')
    .select('*')
    .eq('owner_id', user.id)
    .single()

  return (
    <div className="flex min-h-screen">
      <Sidebar workspace={workspace} userEmail={user.email ?? ''} />
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  )
}
