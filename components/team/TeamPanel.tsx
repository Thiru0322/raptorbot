'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { Workspace } from '@/lib/types'

interface Member {
  id: string; email: string; role: string; status: string
  invite_token: string; joined_at?: string; created_at: string
}

interface Props {
  workspace: Workspace | null
  members: Member[]
  currentUserId: string
  currentUserEmail: string
}

const ROLE_COLORS: Record<string, string> = {
  owner: 'text-raptor-400 bg-raptor-900/30 border-raptor-700/30',
  admin: 'text-blue-400 bg-blue-950/30 border-blue-900/30',
  member: 'text-gray-400 bg-surface-3 border-surface-4',
}

export default function TeamPanel({ workspace, members, currentUserId, currentUserEmail }: Props) {
  const [email, setEmail] = useState('')
  const [role, setRole] = useState('member')
  const [loading, setLoading] = useState(false)
  const [removing, setRemoving] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const router = useRouter()

  const seatLimits: Record<string, number> = { free: 1, pro: 3, enterprise: 999 }
  const plan = workspace?.plan || 'free'
  const limit = seatLimits[plan] ?? 1
  const activeCount = members.filter(m => m.status === 'active').length

  async function invite(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim()) return
    setLoading(true)
    setError('')
    setSuccess('')

    const res = await fetch('/api/team', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email.trim(), role }),
    })
    const data = await res.json()
    if (!res.ok) setError(data.error)
    else {
      setSuccess(`Invite sent to ${email}`)
      setEmail('')
      router.refresh()
    }
    setLoading(false)
  }

  async function remove(memberId: string) {
    setRemoving(memberId)
    await fetch(`/api/team/${memberId}`, { method: 'DELETE' })
    router.refresh()
    setRemoving(null)
  }

  async function changeRole(memberId: string, newRole: string) {
    await fetch(`/api/team/${memberId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role: newRole }),
    })
    router.refresh()
  }

  const inviteLink = members.find(m => m.status === 'pending' && m.email === email)
    ? `${process.env.NEXT_PUBLIC_APP_URL}/invite/${members.find(m => m.email === email)?.invite_token}`
    : null

  return (
    <div className="space-y-6">
      {/* Seats usage */}
      <div className="card p-5 flex items-center justify-between">
        <div>
          <p className="text-sm font-medium">Team seats</p>
          <p className="text-xs text-gray-600 mt-0.5 capitalize">
            {activeCount} of {limit === 999 ? 'unlimited' : limit} seats used on {plan} plan
          </p>
        </div>
        {plan === 'free' && (
          <span className="text-xs text-gray-500">
            Free tier
          </span>
        )}
      </div>

      {/* Current members */}
      <div className="card overflow-hidden">
        <div className="px-5 py-4 border-b border-surface-3">
          <h3 className="text-sm font-medium">Members</h3>
        </div>

        {/* Owner row */}
        <div className="flex items-center gap-3 px-5 py-3.5 border-b border-surface-3">
          <div className="w-8 h-8 rounded-full bg-raptor-900/40 flex items-center justify-center text-sm font-medium text-raptor-300">
            {currentUserEmail[0].toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{currentUserEmail}</p>
            <p className="text-xs text-gray-600">You</p>
          </div>
          <span className={`text-xs px-2 py-0.5 rounded-full border ${ROLE_COLORS.owner}`}>owner</span>
        </div>

        {members.map(member => (
          <div key={member.id} className="flex items-center gap-3 px-5 py-3.5 border-b border-surface-3 last:border-0">
            <div className="w-8 h-8 rounded-full bg-surface-3 flex items-center justify-center text-sm font-medium text-gray-400">
              {member.email[0].toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm truncate">{member.email}</p>
              <p className="text-xs text-gray-600">
                {member.status === 'pending' ? '⏳ Invite pending' : `Joined ${new Date(member.joined_at!).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`}
              </p>
            </div>
            <select
              value={member.role}
              onChange={e => changeRole(member.id, e.target.value)}
              className="bg-surface-2 border border-surface-3 rounded-lg px-2 py-1 text-xs text-gray-400 outline-none">
              <option value="admin">admin</option>
              <option value="member">member</option>
            </select>
            <button
              onClick={() => remove(member.id)}
              disabled={removing === member.id}
              className="text-xs text-gray-700 hover:text-red-400 transition-colors px-2 py-1">
              {removing === member.id ? '…' : 'Remove'}
            </button>
          </div>
        ))}

        {members.length === 0 && (
          <div className="px-5 py-8 text-center text-sm text-gray-700">
            No team members yet — invite someone below
          </div>
        )}
      </div>

      {/* Invite form */}
      <div className="card p-6">
        <h3 className="text-sm font-medium mb-1">Invite teammate</h3>
        <p className="text-xs text-gray-600 mb-4">
          They'll receive an email with a link to join your workspace.
          {plan === 'free' && ' Free plan includes 1 seat.'}
        </p>

        <form onSubmit={invite} className="flex gap-3 items-start">
          <div className="flex-1">
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="colleague@company.com"
              className="input"
              required
            />
          </div>
          <select
            value={role}
            onChange={e => setRole(e.target.value)}
            className="bg-surface-0 border border-surface-3 rounded-lg px-3 py-2.5 text-sm text-gray-400 outline-none focus:border-raptor-400/50">
            <option value="member">Member</option>
            <option value="admin">Admin</option>
          </select>
          <button type="submit" disabled={loading || activeCount >= limit}
            className="btn-primary whitespace-nowrap">
            {loading ? 'Sending…' : 'Send invite'}
          </button>
        </form>

        {error && <p className="text-xs text-red-400 mt-3">{error}</p>}
        {success && <p className="text-xs text-green-400 mt-3">✓ {success}</p>}

        {activeCount >= limit && (
          <p className="text-xs text-amber-500 mt-3">
            Seat limit reached. <a href="/dashboard/billing" className="underline">Upgrade your plan</a> to invite more teammates.
          </p>
        )}
      </div>

      {/* Role guide */}
      <div className="card p-5">
        <h3 className="text-xs text-gray-600 uppercase tracking-wider mb-3">Role permissions</h3>
        <div className="space-y-2 text-xs text-gray-500">
          <div className="flex gap-3"><span className="w-16 text-raptor-400 font-medium">Owner</span><span>Full access — billing, settings, delete workspace</span></div>
          <div className="flex gap-3"><span className="w-16 text-blue-400 font-medium">Admin</span><span>Manage bots, view inbox, invite/remove members</span></div>
          <div className="flex gap-3"><span className="w-16 text-gray-400 font-medium">Member</span><span>View bots and inbox, cannot change settings</span></div>
        </div>
      </div>
    </div>
  )
}
