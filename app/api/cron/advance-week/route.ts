import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { getMockSchedule, parseOddsApiGames } from '@/lib/nfl/mock-data'

// Runs Wednesday at midnight ET (0 5 * * 3 in UTC).
// 1. Closes the current week if not already closed.
// 2. Creates the next week record.
// 3. Pre-populates the schedule (teams + times, no spreads) so the slate is
//    immediately visible to players and the commissioner can fetch lines when ready.

export async function POST(request: Request) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const db = createServiceClient()

    // Find current non-closed week
    const { data: currentWeek } = await db
      .from('weeks')
      .select('id, week_number, season_year, status')
      .neq('status', 'closed')
      .order('week_number', { ascending: false })
      .limit(1)
      .maybeSingle()

    // Close it if still open
    if (currentWeek) {
      await db.from('weeks').update({ status: 'closed' }).eq('id', currentWeek.id)
    }

    // Determine next week
    const { data: league } = await db.from('league').select('season_year').limit(1).maybeSingle()
    const seasonYear = currentWeek?.season_year ?? league?.season_year ?? new Date().getFullYear()
    const nextWeekNumber = currentWeek ? currentWeek.week_number + 1 : 1

    if (nextWeekNumber > 18) {
      return NextResponse.json({ ok: true, skipped: true, reason: 'Regular season complete (week 18 done)' })
    }

    // Create next week record
    const { data: nextWeek, error: weekError } = await db
      .from('weeks')
      .upsert(
        { week_number: nextWeekNumber, season_year: seasonYear, status: 'pending' },
        { onConflict: 'week_number,season_year' }
      )
      .select()
      .single()

    if (weekError || !nextWeek) {
      return NextResponse.json({ error: 'Failed to create next week' }, { status: 500 })
    }

    // Pre-populate schedule (no spreads — commissioner fetches lines separately)
    await db.from('games').delete().eq('week_id', nextWeek.id).eq('is_tiebreaker', false)

    let games
    if (process.env.MOCK_ODDS === 'true') {
      games = getMockSchedule()
    } else {
      const { fetchNFLOdds } = await import('@/lib/odds-api/client')
      const oddsData = await fetchNFLOdds()
      games = parseOddsApiGames(oddsData).map((g) => ({ ...g, spread: 0, spread_favorite: 'home' as const }))
    }

    await db.from('games').insert(games.map((g) => ({ ...g, week_id: nextWeek.id })))

    return NextResponse.json({
      ok: true,
      closedWeek: currentWeek?.week_number ?? null,
      nextWeek: nextWeekNumber,
      gameCount: games.length,
    })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
