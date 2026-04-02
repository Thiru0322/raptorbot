import { NextResponse } from 'next/server'

// Billing is disabled for now (free for everyone).
export async function POST() {
  return NextResponse.json({ error: 'Billing disabled' }, { status: 404 })
}
