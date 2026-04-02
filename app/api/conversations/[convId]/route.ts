import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function PATCH(req: NextRequest, { params }: { params: { convId: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const allowed = ['status', 'assigned_to', 'visitor_name', 'visitor_email', 'tags']
  const update: Record<string, any> = {}
  for (const key of allowed) {
    if (key in body) update[key] = body[key]
  }

  const { error } = await supabase
    .from('conversations')
    .update(update)
    .eq('id', params.convId)

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ success: true })
}
