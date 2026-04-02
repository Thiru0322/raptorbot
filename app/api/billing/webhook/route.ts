import { NextResponse } from 'next/server'

// Billing is disabled for now (free for everyone). Keep the endpoint to avoid 404s.
export async function POST() {
  return NextResponse.json({ received: true })
}
