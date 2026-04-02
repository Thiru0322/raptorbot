import { createClient } from '@/lib/supabase/server'
import { headers } from 'next/headers'
import { notFound } from 'next/navigation'
import DeployPanel from '@/components/bot/DeployPanel'

export default async function DeployPage({ params }: { params: { botId: string } }) {
  const supabase = createClient()
  const { data: bot } = await supabase
    .from('bots').select('*').eq('id', params.botId).single()
  if (!bot) notFound()

  const envUrl = process.env.NEXT_PUBLIC_APP_URL
  const h = headers()
  const host = h.get('x-forwarded-host') || h.get('host')
  const proto = h.get('x-forwarded-proto') || 'https'
  const runtimeUrl = host ? `${proto}://${host}` : null

  const appUrl =
    !envUrl || envUrl.includes('localhost')
      ? (runtimeUrl || 'https://your-app.vercel.app')
      : envUrl

  return (
    <div className="p-8 max-w-3xl">
      <div className="mb-7">
        <h2 className="text-xl font-semibold tracking-tight">Deploy</h2>
        <p className="text-sm text-gray-500 mt-1">Embed your chatbot on any website with one snippet</p>
      </div>
      <DeployPanel bot={bot} appUrl={appUrl} />
    </div>
  )
}
