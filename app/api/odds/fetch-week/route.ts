import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { fetchNFLOdds } from '@/lib/odds-api/client'

// Cron endpoint — fires every hour on Thursdays (UTC).
// Checks whether now falls within the fetch window relative to thursday_kickoff.
// Uses league.fetch_hours_before_kickoff (default 12) as the anchor.
// Fetches once per week — skips if a week already exists for this season/week.

export async function POST(request: Request) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const db = createServiceClient()

    // Get league settings
    const { data: league } = await db
      .from('league')
      .select('id, fetch_hours_before_kickoff, season_year')
      .limit(1)
      .maybeSingle()

    if (!league) {
      return NextResponse.json({ error: 'League not configured' }, { status: 400 })
    }

    const fetchHours = league.fetch_hours_before_kickoff ?? 12

    // Determine next week number and check if already fetched
    const { data: latestWeek } = await db
      .from('weeks')
      .select('week_number, status, thursday_kickoff')
      .eq('season_year', league.season_year)
      .order('week_number', { ascending: false })
      .limit(1)
      .maybeSingle()

    // Skip if the latest week is still pending/open (already fetched this week)
    if (latestWeek && ['pending', 'open'].includes(latestWeek.status)) {
      return NextResponse.json({ ok: true, skipped: true, reason: 'week already active' })
    }

    // Check time window: only fetch if we're within the configured window before kickoff.
    // We estimate TNF kickoff as 8:15pm ET (00:15 UTC next day) if not stored yet.
    // Once we have thursday_kickoff stored, we use that.
    const now = new Date()
    const estimatedKickoff = new Date(now)
    estimatedKickoff.setUTCHours(0, 15, 0, 0) // 8:15pm ET ≈ 00:15 UTC Friday
    estimatedKickoff.setUTCDate(estimatedKickoff.getUTCDate() + 1)

    const kickoff = latestWeek?.thursday_kickoff
      ? new Date(latestWeek.thursday_kickoff)
      : estimatedKickoff

    const hoursUntilKickoff = (kickoff.getTime() - now.getTime()) / (1000 * 60 * 60)

    if (hoursUntilKickoff > fetchHours || hoursUntilKickoff < 0) {
      return NextResponse.json({
        ok: true,
        skipped: true,
        reason: `outside fetch window (${Math.round(hoursUntilKickoff)}h until kickoff, window is ${fetchHours}h)`,
      })
    }

    const weekNumber = latestWeek ? latestWeek.week_number + 1 : 1

    // Fetch game data
    const oddsData = process.env.MOCK_ODDS === 'true' ? [] : await fetchNFLOdds()

    // Create week — leave at 'pending' for commissioner review and announcement
    const { data: week, error: weekError } = await db
      .from('weeks')
      .upsert(
        { week_number: weekNumber, season_year: league.season_year, status: 'pending' },
        { onConflict: 'week_number,season_year' }
      )
      .select()
      .single()

    if (weekError || !week) {
      return NextResponse.json({ error: 'Failed to create week' }, { status: 500 })
    }

    return NextResponse.json({
      ok: true,
      weekNumber,
      gameCount: oddsData.length,
    })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
