import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { gameId } = body as { gameId?: unknown }

  if (!gameId || typeof gameId !== 'string') {
    return NextResponse.json({ error: 'gameId is required' }, { status: 400 })
  }

  // Validate game exists and kickoff is in the future
  const { data: game } = await supabase
    .from('games')
    .select('id, week_id, kickoff_time')
    .eq('id', gameId)
    .maybeSingle()

  if (!game) {
    return NextResponse.json({ error: 'Game not found' }, { status: 400 })
  }

  if (new Date(game.kickoff_time) <= new Date()) {
    return NextResponse.json(
      { error: 'Game has already started — picks are locked' },
      { status: 403 }
    )
  }

  // Verify week is open
  const { data: week } = await supabase
    .from('weeks')
    .select('status')
    .eq('id', game.week_id)
    .maybeSingle()

  if (week?.status !== 'open') {
    return NextResponse.json({ error: 'This week is not open for picks' }, { status: 403 })
  }

  const { error } = await createServiceClient()
    .from('picks')
    .delete()
    .eq('user_id', user.id)
    .eq('game_id', gameId)

  if (error) {
    console.error('Pick delete error:', error)
    return NextResponse.json({ error: 'Failed to delete pick' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
