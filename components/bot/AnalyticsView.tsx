'use client'
import type { AnalyticsDay, Message } from '@/lib/types'

interface Props {
  analytics: AnalyticsDay[]
  recentMessages: Pick<Message, 'content' | 'role' | 'created_at'>[]
}

const MOCK: AnalyticsDay[] = [
  { date: 'Mon', total_messages: 42, total_conversations: 18, resolved_count: 36, unique_visitors: 15 },
  { date: 'Tue', total_messages: 67, total_conversations: 29, resolved_count: 59, unique_visitors: 24 },
  { date: 'Wed', total_messages: 55, total_conversations: 22, resolved_count: 48, unique_visitors: 19 },
  { date: 'Thu', total_messages: 89, total_conversations: 38, resolved_count: 74, unique_visitors: 31 },
  { date: 'Fri', total_messages: 103, total_conversations: 44, resolved_count: 91, unique_visitors: 38 },
  { date: 'Sat', total_messages: 34, total_conversations: 14, resolved_count: 30, unique_visitors: 12 },
  { date: 'Sun', total_messages: 28, total_conversations: 11, resolved_count: 25, unique_visitors: 10 },
]

export default function AnalyticsView({ analytics, recentMessages }: Props) {
  const data = analytics.length > 0 ? analytics.slice(-7).map(d => ({
    ...d,
    date: new Date(d.date).toLocaleDateString('en-US', { weekday: 'short' }),
  })) : MOCK

  const totals = data.reduce((acc, d) => ({
    messages: acc.messages + d.total_messages,
    conversations: acc.conversations + d.total_conversations,
    resolved: acc.resolved + d.resolved_count,
    visitors: acc.visitors + d.unique_visitors,
  }), { messages: 0, conversations: 0, resolved: 0, visitors: 0 })

  const resolutionRate = totals.messages > 0
    ? Math.round((totals.resolved / totals.messages) * 100)
    : 0

  const maxMsgs = Math.max(...data.map(d => d.total_messages), 1)

  const isEmpty = analytics.length === 0

  return (
    <div className="space-y-6 max-w-4xl">
      {isEmpty && (
        <div className="rounded-xl border border-amber-900/30 bg-amber-950/20 px-4 py-3 text-xs text-amber-500">
          No real data yet — showing sample data. Deploy your bot and start chatting to populate analytics.
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Messages',  value: totals.messages.toLocaleString(),  sub: 'last 7 days' },
          { label: 'Conversations',   value: totals.conversations.toLocaleString(), sub: 'last 7 days' },
          { label: 'Resolution Rate', value: `${resolutionRate}%`,              sub: 'messages resolved' },
          { label: 'Unique Visitors', value: totals.visitors.toLocaleString(),  sub: 'last 7 days' },
        ].map(s => (
          <div key={s.label} className="card p-5">
            <p className="text-xs text-gray-600 mb-2">{s.label}</p>
            <p className="text-2xl font-semibold tracking-tight">{s.value}</p>
            <p className="text-xs text-gray-700 mt-1">{s.sub}</p>
          </div>
        ))}
      </div>

      {/* Bar chart */}
      <div className="card p-6">
        <p className="text-sm font-medium text-gray-400 mb-6">Daily Message Volume</p>
        <div className="flex items-end gap-3" style={{ height: 160 }}>
          {data.map((d, i) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-1.5">
              <span className="text-[11px] text-gray-700">{d.total_messages}</span>
              <div className="w-full flex gap-1">
                <div className="flex-1 rounded-t-sm transition-all"
                  style={{
                    height: Math.round((d.total_messages / maxMsgs) * 120),
                    background: '#7c6af533',
                    minHeight: 4,
                  }} />
                <div className="flex-1 rounded-t-sm transition-all"
                  style={{
                    height: Math.round((d.resolved_count / maxMsgs) * 120),
                    background: '#5eead433',
                    minHeight: 4,
                  }} />
              </div>
              <span className="text-[11px] text-gray-600">{d.date}</span>
            </div>
          ))}
        </div>
        <div className="flex gap-5 mt-4">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-sm" style={{ background: '#7c6af533', border: '1px solid #7c6af566' }} />
            <span className="text-xs text-gray-600">Messages</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-sm" style={{ background: '#5eead433', border: '1px solid #5eead466' }} />
            <span className="text-xs text-gray-600">Resolved</span>
          </div>
        </div>
      </div>

      {/* Recent messages */}
      <div className="card p-6">
        <p className="text-sm font-medium text-gray-400 mb-4">
          {recentMessages.length > 0 ? 'Recent User Messages' : 'Sample Top Questions'}
        </p>
        <div className="space-y-2">
          {(recentMessages.length > 0
            ? recentMessages.slice(0, 8).map(m => ({ q: m.content, time: m.created_at }))
            : [
                { q: 'How do I reset my password?', time: null },
                { q: 'What are the pricing plans?', time: null },
                { q: 'How do I cancel my subscription?', time: null },
                { q: 'Is there a mobile app?', time: null },
                { q: 'How do I contact support?', time: null },
              ]
          ).map((item, i) => (
            <div key={i} className="flex items-center gap-3 py-2.5 border-b border-surface-3 last:border-0">
              <span className="text-xs text-gray-700 w-5 shrink-0 text-right">{i + 1}</span>
              <p className="text-sm text-gray-300 flex-1 truncate">{item.q}</p>
              {item.time && (
                <span className="text-xs text-gray-700 shrink-0">
                  {new Date(item.time).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </span>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
