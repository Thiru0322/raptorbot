import Stripe from 'stripe'

let _stripe: Stripe | null = null

function getStripeSecretKey(): string | null {
  const k = process.env.STRIPE_SECRET_KEY
  if (!k) return null
  return k
}

// Lazy init so Next.js builds don't require STRIPE_SECRET_KEY.
export function getStripe() {
  if (_stripe) return _stripe
  const secretKey = getStripeSecretKey()
  if (!secretKey) {
    throw new Error('Stripe is not configured (missing STRIPE_SECRET_KEY).')
  }
  _stripe = new Stripe(secretKey, { typescript: true })
  return _stripe
}

export const PLANS = {
  free: {
    name: 'Free',
    price: 0,
    priceId: null,
    messageLimit: 200,
    botLimit: 1,
    features: ['1 bot', '200 messages/month', 'Knowledge base', 'All LLM providers', 'Embed widget'],
  },
  pro: {
    name: 'Pro',
    price: 29,
    priceId: process.env.STRIPE_PRICE_PRO!,
    messageLimit: 10000,
    botLimit: 10,
    features: ['10 bots', '10,000 messages/month', 'Conversation inbox', 'Team members (3 seats)', 'Human handoff', 'Analytics', 'Priority support'],
  },
  enterprise: {
    name: 'Enterprise',
    price: 99,
    priceId: process.env.STRIPE_PRICE_ENTERPRISE!,
    messageLimit: 100000,
    botLimit: 999,
    features: ['Unlimited bots', '100,000 messages/month', 'Unlimited team seats', 'Custom domain widget', 'SLA support', 'SSO (coming soon)'],
  },
} as const

export type PlanId = keyof typeof PLANS

export function getPlanLimits(plan: string) {
  return PLANS[plan as PlanId] ?? PLANS.free
}
