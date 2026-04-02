import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import SandboxChat from '@/components/bot/SandboxChat'

export default async function SandboxPage({ params }: { params: { botId: string } }) {
  const supabase = createClient()
  const { data: bot } = await supabase
    .from('bots').select('*').eq('id', params.botId).single()
  if (!bot) notFound()

  // Keep llm_api_key_enc so SandboxChat can check if key exists
  // Actual decryption happens in /api/sandbox/[botId] server route
  return (
    <div className="p-8">
      <div className="mb-7">
        <h2 className="text-xl font-semibold tracking-tight">Sandbox</h2>
        <p className="text-sm text-gray-500 mt-1">Test your bot exactly as visitors will experience it</p>
      </div>
      <SandboxChat bot={bot} />
    </div>
  )
}
