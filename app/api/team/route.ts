import { createClient } from '@/lib/supabase/server'
import { createClient as adminClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

function admin() {
  return adminClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}

// POST /api/team — invite a member
export async function POST(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { email, role } = await req.json()
  if (!email) return NextResponse.json({ error: 'Email required' }, { status: 400 })

  const { data: workspace } = await supabase
    .from('workspaces').select('id, plan').eq('owner_id', user.id).single()
  if (!workspace) return NextResponse.json({ error: 'No workspace' }, { status: 404 })

  // Seat limits by plan
  const seatLimits: Record<string, number> = { free: 1, pro: 3, enterprise: 999 }
  const { count } = await supabase
    .from('team_members')
    .select('*', { count: 'exact', head: true })
    .eq('workspace_id', workspace.id)
    .eq('status', 'active')

  const limit = seatLimits[workspace.plan] ?? 1
  if ((count ?? 0) >= limit) {
    return NextResponse.json({
      error: `Your ${workspace.plan} plan allows ${limit} team member${limit > 1 ? 's' : ''}. Upgrade to add more.`
    }, { status: 403 })
  }

  // Check if already invited
  const { data: existing } = await supabase
    .from('team_members')
    .select('id')
    .eq('workspace_id', workspace.id)
    .eq('email', email)
    .single()

  if (existing) return NextResponse.json({ error: 'This person is already in your workspace' }, { status: 409 })

  const { data: member, error } = await admin()
    .from('team_members')
    .insert({
      workspace_id: workspace.id,
      email,
      role: role || 'member',
      invited_by: user.id,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  // In production: send invite email here via Resend/SendGrid
  // await sendInviteEmail({ email, token: member.invite_token, inviterEmail: user.email })

  return NextResponse.json({ member })
}

// GET /api/team — list members
export async function GET() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: workspace } = await supabase
    .from('workspaces').select('id').eq('owner_id', user.id).single()

  const { data: members } = await supabase
    .from('team_members')
    .select('*')
    .eq('workspace_id', workspace?.id)
    .order('created_at')

  return NextResponse.json({ members: members ?? [] })
}
