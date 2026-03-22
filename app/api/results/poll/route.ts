import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json({ message: 'Result polling not yet implemented' }, { status: 501 })
}
