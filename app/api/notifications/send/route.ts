import { NextResponse } from 'next/server'

export async function POST() {
  return NextResponse.json({ message: 'Notifications not yet implemented' }, { status: 501 })
}
