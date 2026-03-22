import { NextResponse } from 'next/server'

export async function POST() {
  return NextResponse.json({ message: 'Picks upsert not yet implemented' }, { status: 501 })
}
