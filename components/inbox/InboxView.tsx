'use client'
import { useRouter, usePathname } from 'next/navigation'
import { useState } from 'react'

interface Bot { id: string; name: string; avatar: string }
interface Conv {
  id: string; session_id: string; visitor_name?: string; visitor_email?: string
  status: string; started_at: string; last_message_at: string; message_count?: number
  tags?: string[]; handoff_requested_at?: string; bots: Bot
}
interface Message { id: string; role: string; content: string; created_at: string }

interface Props {
  bots: Bot[]
  conversations: Conv[]
  selectedMessages: Message[]
  selectedConversationId?: string
  filters: { botId?: string; status?: string }
}

const STATUS_COLORS: Record<string, string> = {
  open: 'text-blue-400 bg-blue-950/40 border-blue-900/30',
  resolved: 'text-green-400 bg-green-950/40 border-green-900/30',
  escalated: 'text-amber-400 bg-amber-950/40 border-amber-900/30',
}

export default function InboxView({ bots, conversations, selectedMessages, selectedConversationId, filters }: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const [resolving, setResolving] = useState<string | null>(null)

  function setFilter(key: string, value: string | undefined) {
    const params = new URLSearchParams()
    if (filters.botId && key !== 'botId') params.set('botId', filters.botId)
    if (filters.status && key !== 'status') params.set('status', filters.status)
    if (value) params.set(key, value)
    if (selectedConversationId) params.set('conversationId', selectedConversationId)
    router.push(`${pathname}?${params.toString()}`)
  }

  function selectConversation(id: string) {
    const params = new URLSearchParams()
    if (filters.botId) params.set('botId', filters.botId)
    if (filters.status) params.set('status', filters.status)
    params.set('conversationId', id)
    router.push(`${pathname}?${params.toString()}`)
  }

  async function resolve(convId: string) {
    setResolving(convId)
    await fetch(`/api/conversations/${convId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'resolved' }),
    })
    router.refresh()
    setResolving(null)
  }

  const selected = conversations.find(c => c.id === selectedConversationId)

  return (
    <div className="flex gap-0 border border-surface-3 rounded-2xl overflow-hidden" style={{ height: 'calc(100vh - 200px)', minHeight: 500 }}>
      {/* Left panel - conversation list */}
      <div className="w-80 shrink-0 border-r border-surface-3 flex flex-col">
        {/* Filters */}
        <div className="p-3 border-b border-surface-3 space-y-2">
          <select
            value={filters.botId || ''}
            onChange={e => setFilter('botId', e.target.value || undefined)}
            className="w-full bg-surface-2 border border-surface-3 rounded-lg px-3 py-2 text-xs text-gray-400 outline-none">
            <option value="">All bots</option>
            {bots.map(b => <option key={b.id} value={b.id}>{b.avatar} {b.name}</option>)}
          </select>
          <div className="flex gap-1.5">
            {['', 'open', 'resolved', 'escalated'].map(s => (
              <button key={s} onClick={() => setFilter('status', s || undefined)}
                className={`flex-1 py-1.5 text-xs rounded-lg border transition-all ${
                  (filters.status || '') === s
                    ? 'border-raptor-400/50 bg-raptor-900/20 text-raptor-300'
                    : 'border-surface-3 text-gray-600 hover:text-gray-400'
                }`}>
                {s || 'All'}
              </button>
            ))}
          </div>
        </div>

        {/* Conversation list */}
        <div className="flex-1 overflow-y-auto">
          {conversations.length === 0 ? (
            <div className="p-8 text-center text-sm text-gray-700">
              No conversations yet
            </div>
          ) : (
            conversations.map(conv => (
              <div
                key={conv.id}
                onClick={() => selectConversation(conv.id)}
                className={`p-3.5 border-b border-surface-3 cursor-pointer transition-colors ${
                  conv.id === selectedConversationId
                    ? 'bg-raptor-900/20'
                    : 'hover:bg-surface-2'
                }`}>
                <div className="flex items-start justify-between gap-2 mb-1.5">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-base shrink-0">{conv.bots?.avatar || '🤖'}</span>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">
                        {conv.visitor_name || conv.visitor_email || `Visitor ${conv.session_id.slice(-6)}`}
                      </p>
                      <p className="text-xs text-gray-600 truncate">{conv.bots?.name}</p>
                    </div>
                  </div>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full border shrink-0 ${STATUS_COLORS[conv.status] || 'text-gray-500'}`}>
                    {conv.status}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-xs text-gray-700">
                    {conv.message_count ?? 0} messages
                    {conv.handoff_requested_at && ' · 🚨 handoff'}
                  </p>
                  <p className="text-[10px] text-gray-700">
                    {new Date(conv.last_message_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Right panel - message thread */}
      <div className="flex-1 flex flex-col min-w-0">
        {!selected ? (
          <div className="flex-1 flex items-center justify-center text-gray-700 text-sm">
            Select a conversation to view messages
          </div>
        ) : (
          <>
            {/* Thread header */}
            <div className="px-5 py-3.5 border-b border-surface-3 flex items-center justify-between bg-surface-1">
              <div>
                <p className="text-sm font-semibold">
                  {selected.visitor_name || selected.visitor_email || `Visitor ${selected.session_id.slice(-6)}`}
                </p>
                <p className="text-xs text-gray-600 mt-0.5">
                  {selected.bots?.name} · Started {new Date(selected.started_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                  {selected.visitor_email && ` · ${selected.visitor_email}`}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-xs px-2 py-1 rounded-full border ${STATUS_COLORS[selected.status] || 'text-gray-500'}`}>
                  {selected.status}
                </span>
                {selected.status === 'open' && (
                  <button
                    onClick={() => resolve(selected.id)}
                    disabled={resolving === selected.id}
                    className="text-xs btn-ghost py-1.5 px-3">
                    {resolving === selected.id ? 'Resolving…' : '✓ Resolve'}
                  </button>
                )}
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-5 space-y-3">
              {selectedMessages.length === 0 ? (
                <p className="text-sm text-gray-700 text-center pt-8">No messages loaded</p>
              ) : (
                selectedMessages.map(msg => (
                  <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[70%] rounded-xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap ${
                      msg.role === 'user'
                        ? 'bg-raptor-400/20 text-raptor-100 rounded-br-sm'
                        : msg.role === 'assistant'
                        ? 'bg-surface-3 text-gray-200 rounded-bl-sm'
                        : 'bg-amber-950/40 text-amber-400 text-xs italic w-full text-center'
                    }`}>
                      {msg.content}
                      <p className="text-[10px] opacity-40 mt-1 text-right">
                        {new Date(msg.created_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
