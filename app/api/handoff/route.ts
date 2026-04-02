import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

function adminClient() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders })
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { widget_token, conversation_id, session_id, trigger_reason, last_messages } = body

  const supabase = adminClient()

  // Load bot config
  const { data: bot } = await supabase
    .from('bots')
    .select('id, name, workspace_id, handoff_enabled, handoff_message, slack_webhook_url, notification_email, workspaces(id)')
    .eq('widget_token', widget_token)
    .single()

  if (!bot || !bot.handoff_enabled) {
    return NextResponse.json({ error: 'Handoff not enabled' }, { status: 403, headers: corsHeaders })
  }

  // Create handoff event
  const { data: handoff, error } = await supabase
    .from('handoff_events')
    .insert({
      conversation_id,
      bot_id: bot.id,
      workspace_id: bot.workspace_id,
      trigger_reason: trigger_reason || 'user_requested',
      status: 'pending',
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500, headers: corsHeaders })
  }

  // Update conversation status
  await supabase
    .from('conversations')
    .update({ status: 'escalated', handoff_requested_at: new Date().toISOString() })
    .eq('id', conversation_id)

  // Send Slack notification
  if (bot.slack_webhook_url) {
    const transcript = (last_messages || [])
      .slice(-4)
      .map((m: any) => `*${m.role === 'user' ? '👤 User' : '🤖 Bot'}:* ${m.content.slice(0, 200)}`)
      .join('\n')

    await fetch(bot.slack_webhook_url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: `🚨 *Human handoff requested* — ${bot.name}`,
        blocks: [
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `🚨 *A visitor needs human support*\n*Bot:* ${bot.name}\n*Session:* ${session_id?.slice(-8) || 'unknown'}`,
            },
          },
          transcript && {
            type: 'section',
            text: { type: 'mrkdwn', text: `*Recent conversation:*\n${transcript}` },
          },
          {
            type: 'actions',
            elements: [
              {
                type: 'button',
                text: { type: 'plain_text', text: '📬 View in Inbox' },
                url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/inbox?conversationId=${conversation_id}`,
                style: 'primary',
              },
            ],
          },
        ].filter(Boolean),
      }),
    }).catch(() => {}) // Don't fail if Slack is down
  }

  // Send email notification (stub — wire up Resend/SendGrid in production)
  if (bot.notification_email) {
    // await sendHandoffEmail({ to: bot.notification_email, botName: bot.name, sessionId: session_id, conversationId: conversation_id })
  }

  return NextResponse.json(
    { success: true, message: bot.handoff_message, handoff_id: handoff.id },
    { headers: corsHeaders }
  )
}
