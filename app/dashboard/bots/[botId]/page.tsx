import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import CustomizeForm from '@/components/bot/CustomizeForm'

export default async function CustomizePage({ params }: { params: { botId: string } }) {
  const supabase = createClient()
  const { data: bot } = await supabase
    .from('bots').select('*').eq('id', params.botId).single()
  if (!bot) notFound()

  return (
    <div className="p-8 max-w-3xl">
      <div className="mb-7">
        <h2 className="text-xl font-semibold tracking-tight">Customize</h2>
        <p className="text-sm text-gray-500 mt-1">Configure LLM provider, bot mode, and appearance</p>
      </div>
      <CustomizeForm bot={bot} />
    </div>
  )
}
