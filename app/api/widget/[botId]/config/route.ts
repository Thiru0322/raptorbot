import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders })
}

export async function GET(_req: NextRequest, { params }: { params: { botId: string } }) {
  const supabase = adminClient()
  const { data: bot } = await supabase
    .from('bots')
    .select('name, avatar, primary_color, bubble_color, text_color, position, welcome_message')
    .eq('widget_token', params.botId)
    .eq('status', 'active')
    .single()

  if (!bot) {
    return NextResponse.json({ error: 'Not found' }, { status: 404, headers: corsHeaders })
  }

  return NextResponse.json(bot, { headers: corsHeaders })
}
