'use server'

import { revalidatePath } from 'next/cache'
import { createServiceClient } from '@/lib/supabase/server'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

// ─── Auth guard ───────────────────────────────────────────────────────────────

async function requireCommissioner() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await createServiceClient()
    .from('users')
    .select('role')
    .eq('id', user.id)
    .maybeSingle()

  if (profile?.role !== 'commissioner') redirect('/home')
  return user
}

// ─── Mock data ────────────────────────────────────────────────────────────────

function getMockGames() {
  // Next Thursday at 8:20 PM ET
  const now = new Date()
  const thursday = new Date(now)
  const daysUntilThursday = (4 - now.getDay() + 7) % 7 || 7
  thursday.setDate(now.getDate() + daysUntilThursday)
  thursday.setHours(20, 20, 0, 0)

  const sunday = new Date(thursday)
  sunday.setDate(thursday.getDate() + 3)

  const t = (h: number, m: number) => { const d = new Date(thursday); d.setHours(h, m, 0, 0); return d.toISOString() }
  const s = (h: number, m: number) => { const d = new Date(sunday);   d.setHours(h, m, 0, 0); return d.toISOString() }

  // Full slate — all 32 teams playing, no byes (used for UI simulation)
  // spread:0 = line not yet set (TBD)
  return [
    // ── Thursday 8:20 PM ET ──────────────────────────────────────────────────
    { home_team: 'Cincinnati Bengals',     away_team: 'Baltimore Ravens',     spread: 1.5, spread_favorite: 'away', kickoff_time: t(20,20),  day: 'thursday', is_tiebreaker: false, external_id: 'mock_1' },

    // ── Sunday 1:00 PM ET ────────────────────────────────────────────────────
    { home_team: 'New England Patriots',   away_team: 'Buffalo Bills',        spread: 3.0, spread_favorite: 'away', kickoff_time: s(13,0),   day: 'sunday',   is_tiebreaker: false, external_id: 'mock_2' },
    { home_team: 'Indianapolis Colts',     away_team: 'New York Jets',        spread: 0,   spread_favorite: 'home', kickoff_time: s(13,0),   day: 'sunday',   is_tiebreaker: false, external_id: 'mock_3' },
    { home_team: 'Houston Texans',         away_team: 'Jacksonville Jaguars', spread: 2.5, spread_favorite: 'home', kickoff_time: s(13,0),   day: 'sunday',   is_tiebreaker: false, external_id: 'mock_4' },
    { home_team: 'New Orleans Saints',     away_team: 'Carolina Panthers',    spread: 4.5, spread_favorite: 'home', kickoff_time: s(13,0),   day: 'sunday',   is_tiebreaker: false, external_id: 'mock_5' },
    { home_team: 'Detroit Lions',          away_team: 'Chicago Bears',        spread: 7.0, spread_favorite: 'home', kickoff_time: s(13,0),   day: 'sunday',   is_tiebreaker: false, external_id: 'mock_6' },
    { home_team: 'New York Giants',        away_team: 'Green Bay Packers',    spread: 0,   spread_favorite: 'away', kickoff_time: s(13,0),   day: 'sunday',   is_tiebreaker: false, external_id: 'mock_7' },
    { home_team: 'Dallas Cowboys',         away_team: 'Philadelphia Eagles',  spread: 1.0, spread_favorite: 'away', kickoff_time: s(13,0),   day: 'sunday',   is_tiebreaker: false, external_id: 'mock_8' },
    { home_team: 'Tennessee Titans',       away_team: 'Pittsburgh Steelers',  spread: 0,   spread_favorite: 'away', kickoff_time: s(13,0),   day: 'sunday',   is_tiebreaker: false, external_id: 'mock_9' },
    { home_team: 'Atlanta Falcons',        away_team: 'Arizona Cardinals',    spread: 3.0, spread_favorite: 'home', kickoff_time: s(13,0),   day: 'sunday',   is_tiebreaker: false, external_id: 'mock_10' },

    // ── Sunday 4:25 PM ET ────────────────────────────────────────────────────
    { home_team: 'Denver Broncos',         away_team: 'Las Vegas Raiders',    spread: 3.5, spread_favorite: 'home', kickoff_time: s(16,25),  day: 'sunday',   is_tiebreaker: false, external_id: 'mock_11' },
    { home_team: 'Kansas City Chiefs',     away_team: 'Los Angeles Chargers', spread: 6.5, spread_favorite: 'home', kickoff_time: s(16,25),  day: 'sunday',   is_tiebreaker: false, external_id: 'mock_12' },
    { home_team: 'Washington Commanders',  away_team: 'Tampa Bay Buccaneers', spread: 0,   spread_favorite: 'home', kickoff_time: s(16,25),  day: 'sunday',   is_tiebreaker: false, external_id: 'mock_13' },
    { home_team: 'Los Angeles Rams',       away_team: 'Seattle Seahawks',     spread: 2.5, spread_favorite: 'home', kickoff_time: s(16,25),  day: 'sunday',   is_tiebreaker: false, external_id: 'mock_14' },
    { home_team: 'Minnesota Vikings',      away_team: 'San Francisco 49ers',  spread: 1.0, spread_favorite: 'away', kickoff_time: s(16,25),  day: 'sunday',   is_tiebreaker: false, external_id: 'mock_15' },

    // ── Sunday Night 8:20 PM ET (SNF) ────────────────────────────────────────
    { home_team: 'Miami Dolphins',         away_team: 'Cleveland Browns',     spread: 2.5, spread_favorite: 'home', kickoff_time: s(20,20),  day: 'sunday',   is_tiebreaker: false, external_id: 'mock_16' },

    // MNF not included — tiebreaker game is created separately if threshold is met
    // All 32 teams accounted for
  ]
}

function parseOddsApiGames(oddsData: any[]) {
  const games = []

  for (const event of oddsData) {
    const spreadsMarket = event.bookmakers?.[0]?.markets?.find(
      (m: any) => m.key === 'spreads'
    )
    if (!spreadsMarket) continue

    const homeOutcome = spreadsMarket.outcomes.find(
      (o: any) => o.name === event.home_team
    )
    const awayOutcome = spreadsMarket.outcomes.find(
      (o: any) => o.name === event.away_team
    )
    if (!homeOutcome || !awayOutcome) continue

    const kickoff = new Date(event.commence_time)
    const day = kickoff.getDay()
    const dayMap: Record<number, string> = {
      0: 'sunday',
      1: 'monday',
      4: 'thursday',
      5: 'friday',
      6: 'saturday',
    }
    const gameDay = dayMap[day] ?? 'sunday'

    const homeSpread = homeOutcome.point
    const spreadFavorite = homeSpread < 0 ? 'home' : 'away'

    games.push({
      home_team: event.home_team,
      away_team: event.away_team,
      spread: Math.abs(homeSpread),
      spread_favorite: spreadFavorite,
      kickoff_time: kickoff.toISOString(),
      day: gameDay,
      is_tiebreaker: false,
      external_id: event.id,
    })
  }

  return games
}

// ─── Actions ──────────────────────────────────────────────────────────────────

export async function fetchAndSaveLines(weekNumber: number, seasonYear: number) {
  await requireCommissioner()
  const db = createServiceClient()

  // Create the week record
  const { data: week, error: weekError } = await db
    .from('weeks')
    .upsert(
      { week_number: weekNumber, season_year: seasonYear, status: 'pending' },
      { onConflict: 'week_number,season_year' }
    )
    .select()
    .single()

  if (weekError || !week) throw new Error('Failed to create week')

  // Delete any existing games for this week (re-fetch idempotency)
  await db.from('games').delete().eq('week_id', week.id)

  let games
  if (process.env.MOCK_ODDS === 'true') {
    games = getMockGames()
  } else {
    const { fetchNFLOdds } = await import('@/lib/odds-api/client')
    const oddsData = await fetchNFLOdds()
    games = parseOddsApiGames(oddsData)
  }

  const { error: gamesError } = await db.from('games').insert(
    games.map((g) => ({ ...g, week_id: week.id }))
  )

  if (gamesError) throw new Error('Failed to save games')

  revalidatePath('/commissioner')
  revalidatePath('/week')
}

export async function publishWeek(weekId: string, message: string) {
  const user = await requireCommissioner()
  const db = createServiceClient()

  const { error } = await db
    .from('weeks')
    .update({ status: 'open' })
    .eq('id', weekId)

  if (error) throw new Error('Failed to publish week')

  await db.from('announcements').insert({
    week_id: weekId,
    author_id: user.id,
    type: 'slate',
    content: message.trim(),
  })

  revalidatePath('/commissioner')
  revalidatePath('/week')
  revalidatePath('/home')
}

export async function postResults(
  weekId: string,
  results: { gameId: string; result: 'home_win' | 'away_win' | 'push' }[]
) {
  const user = await requireCommissioner()
  const db = createServiceClient()

  // Update each game result — the DB trigger auto-scores picks
  for (const { gameId, result } of results) {
    await db
      .from('games')
      .update({ result, result_confirmed: true })
      .eq('id', gameId)
  }

  await db
    .from('weeks')
    .update({ status: 'results_posted' })
    .eq('id', weekId)

  // Count perfect scorers
  const { data: games } = await db
    .from('games')
    .select('id')
    .eq('week_id', weekId)
    .eq('is_tiebreaker', false)

  const gameIds = (games ?? []).map((g) => g.id)

  const { data: picks } = await db
    .from('picks')
    .select('user_id, result')
    .in('game_id', gameIds)

  const byUser: Record<string, string[]> = {}
  for (const p of picks ?? []) {
    if (!byUser[p.user_id]) byUser[p.user_id] = []
    byUser[p.user_id].push(p.result)
  }

  const perfectCount = Object.values(byUser).filter(
    (results) => results.length > 0 && results.every((r) => r === 'win')
  ).length

  const content =
    perfectCount > 0
      ? `Results are in! 🎉 ${perfectCount} perfect score${perfectCount > 1 ? 's' : ''} this week. Check the standings.`
      : `Results are in! Tough week — no perfect scores. Check the standings to see where you stand.`

  await db.from('announcements').insert({
    week_id: weekId,
    author_id: user.id,
    type: 'results',
    content,
  })

  revalidatePath('/commissioner')
  revalidatePath('/standings')
  revalidatePath('/home')
}

export async function closeWeek(weekId: string) {
  await requireCommissioner()
  const db = createServiceClient()

  const { error } = await db
    .from('weeks')
    .update({ status: 'closed' })
    .eq('id', weekId)

  if (error) throw new Error('Failed to close week')

  revalidatePath('/commissioner')
}

export async function postAnnouncement(weekId: string | null, content: string, type: string = 'general') {
  const user = await requireCommissioner()
  const db = createServiceClient()

  await db.from('announcements').insert({
    week_id: weekId,
    author_id: user.id,
    type,
    content,
  })

  revalidatePath('/home')
  revalidatePath('/commissioner')
}

export async function updateGameSpread(
  gameId: string,
  spread: number,
  spreadFavorite: 'home' | 'away'
) {
  await requireCommissioner()
  const db = createServiceClient()

  const { error } = await db
    .from('games')
    .update({ spread, spread_favorite: spreadFavorite })
    .eq('id', gameId)

  if (error) throw new Error('Failed to update spread')
  revalidatePath('/commissioner')
}

export async function updatePushCountsAs(value: 'win' | 'tie') {
  await requireCommissioner()
  const db = createServiceClient()
  const { data: league } = await db.from('league').select('id').limit(1).maybeSingle()
  if (league) {
    await db.from('league').update({ push_counts_as: value }).eq('id', league.id)
  } else {
    await db.from('league').insert({
      name: "Pick'em League",
      season_year: new Date().getFullYear(),
      push_counts_as: value,
    })
  }
  revalidatePath('/commissioner/league')
}

export async function updateFetchHours(hours: number) {
  await requireCommissioner()
  const db = createServiceClient()

  const { data: league } = await db.from('league').select('id').limit(1).maybeSingle()

  if (league) {
    await db.from('league').update({ fetch_hours_before_kickoff: hours }).eq('id', league.id)
  } else {
    await db.from('league').insert({
      name: "Pick'em League",
      season_year: new Date().getFullYear(),
      fetch_hours_before_kickoff: hours,
    })
  }

  revalidatePath('/commissioner/league')
}

// ─── Dev only ─────────────────────────────────────────────────────────────────

export async function devResetWeekToWednesday(weekId: string) {
  if (process.env.MOCK_ODDS !== 'true') throw new Error('Only available in mock/dev mode')
  await requireCommissioner()
  const db = createServiceClient()

  // Delete existing games and re-insert mock data with no spreads (lines not pulled yet)
  await db.from('games').delete().eq('week_id', weekId)
  const games = getMockGames().map((g) => ({ ...g, spread: 0 }))
  await db.from('games').insert(games.map((g) => ({ ...g, week_id: weekId })))

  // Pending = commish can see matchups, picks not open yet
  await db.from('weeks').update({ status: 'pending' }).eq('id', weekId)

  revalidatePath('/commissioner')
  revalidatePath('/week')
  revalidatePath('/home')
}

export async function invitePlayer(email: string) {
  const user = await requireCommissioner()
  const db = createServiceClient()

  // Check if already invited or already a user
  const { data: existing } = await db
    .from('invites')
    .select('id')
    .eq('email', email)
    .maybeSingle()

  if (existing) throw new Error('Player already invited')

  const { data: existingUser } = await db
    .from('users')
    .select('id')
    .eq('email', email)
    .maybeSingle()

  if (existingUser) throw new Error('Player already in league')

  const { data: invite, error } = await db
    .from('invites')
    .insert({ email, invited_by: user.id })
    .select()
    .single()

  if (error) throw new Error('Failed to create invite')

  revalidatePath('/commissioner/league')
  return invite
}
