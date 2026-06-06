import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

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
    return NextResponse.json({ error: 'pickedTeam must be "home" or "away"' }, { status: 400 })
  }

  const serviceClient = createServiceClient()

  // Fetch the game
  const { data: game, error: gameError } = await serviceClient
    .from('games')
    .select('id, week_id, kickoff_time, is_tiebreaker')
    .eq('id', gameId)
    .maybeSingle()

  if (gameError || !game) {
    return NextResponse.json({ error: 'Game not found' }, { status: 400 })
  }

  // Lock check: kickoff must be in the future
  if (new Date(game.kickoff_time) <= new Date()) {
    return NextResponse.json({ error: 'Game has already started — picks are locked' }, { status: 403 })
  }

  // Fetch the week
  const { data: week } = await serviceClient
    .from('weeks')
    .select('id, status')
    .eq('id', game.week_id)
    .maybeSingle()

  if (!week) {
    return NextResponse.json({ error: 'Week not found' }, { status: 400 })
  }

  // Regular picks: week must be open
  if (!game.is_tiebreaker && week.status !== 'open') {
    return NextResponse.json({ error: 'This week is not open for picks' }, { status: 403 })
  }

  // Tiebreaker picks: week must be in tiebreaker status AND a tiebreaker announcement must exist
  if (game.is_tiebreaker) {
    if (week.status !== 'tiebreaker') {
      return NextResponse.json({ error: 'Tiebreaker is not active' }, { status: 403 })
    }

    // Verify a tiebreaker announcement has been posted (picks are officially open)
    const { data: tbAnnouncement } = await serviceClient
      .from('announcements')
      .select('id')
      .eq('week_id', week.id)
      .eq('type', 'tiebreaker')
      .maybeSingle()

    if (!tbAnnouncement) {
      return NextResponse.json({ error: 'Tiebreaker picks are not open yet' }, { status: 403 })
    }

    // Eligibility check: user must have gone perfect on all non-tiebreaker games this week
    const { data: weekGames } = await serviceClient
      .from('games')
      .select('id')
      .eq('week_id', week.id)
      .eq('is_tiebreaker', false)

    const weekGameIds = (weekGames ?? []).map((g: any) => g.id)

    const { data: userPicks } = await serviceClient
      .from('picks')
      .select('result')
      .eq('user_id', user.id)
      .in('game_id', weekGameIds)

    const allWins =
      (userPicks ?? []).length > 0 &&
      (userPicks ?? []).every((p: any) => p.result === 'win')

    if (!allWins) {
      return NextResponse.json({ error: 'Only players who went perfect are eligible for the tiebreaker' }, { status: 403 })
    }
  }

  // Upsert the pick
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
      { onConflict: 'user_id,game_id' }
    )
    .select('id, picked_team, result')
    .maybeSingle()

  if (upsertError) {
    console.error('Pick upsert error:', upsertError)
    return NextResponse.json({ error: 'Failed to save pick' }, { status: 500 })
  }

  return NextResponse.json({ success: true, pick })
}
