import { NextResponse } from 'next/server'

export async function POST() {
  return NextResponse.json({ message: 'Odds fetch not yet implemented' }, { status: 501 })
}
