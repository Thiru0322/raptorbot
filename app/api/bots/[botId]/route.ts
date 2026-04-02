import { createClient } from '@/lib/supabase/server'
import { encrypt } from '@/lib/crypto'
import { NextRequest, NextResponse } from 'next/server'

export async function PATCH(req: NextRequest, { params }: { params: { botId: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Verify ownership
  const { data: bot } = await supabase
    .from('bots')
    .select('*, workspaces!inner(owner_id)')
    .eq('id', params.botId)
    .single()

  if (!bot || bot.workspaces.owner_id !== user.id)
    return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const body = await req.json()

  // Encrypt API key if provided
  if (body.llm_api_key) {
    try {
      body.llm_api_key_enc = await encrypt(body.llm_api_key)
    } catch {
      return NextResponse.json({ error: 'Failed to encrypt API key' }, { status: 500 })
    }
    delete body.llm_api_key
  }

  // Don't allow overriding id/workspace_id
  delete body.id
  delete body.workspace_id
  delete body.widget_token

  const { data: updated, error } = await supabase
    .from('bots')
    .update(body)
    .eq('id', params.botId)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ bot: updated })
}

export async function DELETE(req: NextRequest, { params }: { params: { botId: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: bot } = await supabase
    .from('bots')
    .select('*, workspaces!inner(owner_id)')
    .eq('id', params.botId)
    .single()

  if (!bot || bot.workspaces.owner_id !== user.id)
    return NextResponse.json({ error: 'Not found' }, { status: 404 })

  await supabase.from('bots').delete().eq('id', params.botId)
  return NextResponse.json({ success: true })
}
