'use client'
import { useState } from 'react'
import { PLANS, type PlanId } from '@/lib/stripe'
import type { Workspace } from '@/lib/types'

export default function BillingPanel({ workspace }: { workspace: Workspace | null }) {
  const [loading, setLoading] = useState<string | null>(null)
  const currentPlan = (workspace?.plan || 'free') as PlanId
  const used = workspace?.messages_used_this_month ?? 0
  const limit = workspace?.message_limit ?? 200
  const usagePct = Math.min(Math.round((used / limit) * 100), 100)

  async function checkout(planId: PlanId) {
    setLoading(planId)
    const res = await fetch('/api/billing/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ planId }),
    })
    const data = await res.json()
    if (data.url) window.location.href = data.url
    else setLoading(null)
  }

  async function openPortal() {
    setLoading('portal')
    const res = await fetch('/api/billing/portal', { method: 'POST' })
    const data = await res.json()
    if (data.url) window.location.href = data.url
    else setLoading(null)
  }

  return (
    <div className="space-y-8">
      {/* Current plan + usage */}
      <div className="card p-6">
        <div className="flex items-start justify-between mb-6">
          <div>
            <p className="text-xs text-gray-600 uppercase tracking-wider mb-1">Current Plan</p>
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-semibold">{PLANS[currentPlan].name}</h2>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                workspace?.subscription_status === 'active'
                  ? 'bg-green-950/50 text-green-400 border border-green-900/40'
                  : workspace?.subscription_status === 'past_due'
                  ? 'bg-red-950/50 text-red-400 border border-red-900/40'
                  : 'bg-surface-3 text-gray-500'
              }`}>
                {workspace?.subscription_status || (currentPlan === 'free' ? 'free tier' : 'inactive')}
              </span>
            </div>
            {workspace?.billing_period_end && (
              <p className="text-xs text-gray-600 mt-1">
                Renews {new Date(workspace.billing_period_end).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
              </p>
            )}
          </div>
          {currentPlan !== 'free' && workspace?.stripe_customer_id && (
            <button onClick={openPortal} disabled={loading === 'portal'}
              className="btn-ghost text-xs">
              {loading === 'portal' ? 'Loading…' : 'Manage subscription'}
            </button>
          )}
        </div>

        {/* Usage meter */}
        <div>
          <div className="flex justify-between items-center mb-2">
            <p className="text-sm text-gray-400">Messages this month</p>
            <p className="text-sm font-medium">
              <span className={usagePct >= 90 ? 'text-red-400' : usagePct >= 70 ? 'text-amber-400' : 'text-white'}>
                {used.toLocaleString()}
              </span>
              <span className="text-gray-600"> / {limit.toLocaleString()}</span>
            </p>
          </div>
          <div className="h-2 bg-surface-3 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${usagePct}%`,
                background: usagePct >= 90 ? '#ef4444' : usagePct >= 70 ? '#f59e0b' : '#7c6af5',
              }}
            />
          </div>
          <p className="text-xs text-gray-700 mt-1.5">{usagePct}% used</p>
        </div>
      </div>

      {/* Plan cards */}
      <div>
        <h3 className="text-sm font-medium text-gray-400 mb-4">All Plans</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {(Object.entries(PLANS) as [PlanId, typeof PLANS[PlanId]][]).map(([id, plan]) => {
            const isCurrent = id === currentPlan
            const isPro = id === 'pro'
            return (
              <div key={id} className={`card p-6 relative ${isPro ? 'border-raptor-400/40' : ''}`}>
                {isPro && (
                  <div className="absolute -top-px left-6 right-6 h-0.5 rounded-full"
                       style={{ background: 'linear-gradient(90deg,#7c6af5,#5eead4)' }} />
                )}
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <p className="text-sm font-semibold">{plan.name}</p>
                    <p className="text-2xl font-bold mt-1">
                      {plan.price === 0 ? 'Free' : `$${plan.price}`}
                      {plan.price > 0 && <span className="text-sm font-normal text-gray-600">/mo</span>}
                    </p>
                  </div>
                  {isCurrent && (
                    <span className="text-xs bg-raptor-900/40 text-raptor-400 border border-raptor-700/30 px-2 py-0.5 rounded-full">
                      Current
                    </span>
                  )}
                  {isPro && !isCurrent && (
                    <span className="text-xs bg-surface-3 text-gray-400 px-2 py-0.5 rounded-full">Popular</span>
                  )}
                </div>

                <ul className="space-y-2 mb-6">
                  {plan.features.map(f => (
                    <li key={f} className="flex items-start gap-2 text-xs text-gray-400">
                      <span className="text-raptor-400 mt-0.5 shrink-0">✓</span>
                      {f}
                    </li>
                  ))}
                </ul>

                {isCurrent ? (
                  <button disabled className="w-full py-2.5 rounded-lg text-sm border border-surface-3 text-gray-600 cursor-default">
                    Current plan
                  </button>
                ) : id === 'free' ? (
                  <button disabled className="w-full py-2.5 rounded-lg text-sm border border-surface-3 text-gray-600 cursor-default">
                    Downgrade
                  </button>
                ) : (
                  <button onClick={() => checkout(id)} disabled={!!loading}
                    className={`w-full py-2.5 rounded-lg text-sm font-medium transition-all ${
                      isPro
                        ? 'bg-raptor-400 hover:bg-raptor-500 text-white'
                        : 'border border-surface-3 text-gray-300 hover:border-raptor-400/40 hover:text-white'
                    }`}>
                    {loading === id ? 'Redirecting…' : `Upgrade to ${plan.name}`}
                  </button>
                )}
              </div>
            )
          })}
        </div>
      </div>

      <p className="text-xs text-gray-700">
        All plans include a 14-day free trial. Cancel anytime. Payments processed by Stripe.
      </p>
    </div>
  )
}
