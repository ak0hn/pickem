import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  // 1. Authenticate the user
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // 2. Parse and validate request body
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { gameId, pickedTeam } = body as { gameId?: unknown; pickedTeam?: unknown }

  if (!gameId || typeof gameId !== 'string') {
    return NextResponse.json({ error: 'gameId is required' }, { status: 400 })
  }

  if (pickedTeam !== 'home' && pickedTeam !== 'away') {
    return NextResponse.json(
      { error: 'pickedTeam must be "home" or "away"' },
      { status: 400 }
    )
  }

  // 3. Fetch the game to validate it exists and check kickoff time
  const { data: game, error: gameError } = await supabase
    .from('games')
    .select('id, week_id, kickoff_time')
    .eq('id', gameId)
    .maybeSingle()

  if (gameError || !game) {
    return NextResponse.json({ error: 'Game not found' }, { status: 400 })
  }

  // 4. Server-side lock check: kickoff must be in the future
  const kickoffTime = new Date(game.kickoff_time)
  const now = new Date()
  if (kickoffTime <= now) {
    return NextResponse.json(
      { error: 'Game has already started — picks are locked' },
      { status: 403 }
    )
  }

  // 5. Verify the week is open
  const { data: week, error: weekError } = await supabase
    .from('weeks')
    .select('id, status')
    .eq('id', game.week_id)
    .maybeSingle()

  if (weekError || !week) {
    return NextResponse.json({ error: 'Week not found' }, { status: 400 })
  }

  if (week.status !== 'open') {
    return NextResponse.json(
      { error: 'This week is not open for picks' },
      { status: 403 }
    )
  }

  // 6. Upsert the pick using the service client (bypasses RLS)
  const serviceClient = createServiceClient()
  const { data: pick, error: upsertError } = await serviceClient
    .from('picks')
    .upsert(
      {
        user_id: user.id,
        game_id: gameId,
        week_id: game.week_id,
        picked_team: pickedTeam,
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: 'user_id,game_id',
      }
    )
    .select('id, picked_team, result')
    .maybeSingle()

  if (upsertError) {
    console.error('Pick upsert error:', upsertError)
    return NextResponse.json(
      { error: 'Failed to save pick' },
      { status: 500 }
    )
  }

  return NextResponse.json({ success: true, pick })
}
