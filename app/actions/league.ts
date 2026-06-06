'use server'

import { createClient, createServiceClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

async function requireCommissioner() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await createServiceClient()
    .from('users')
    .select('role')
    .eq('id', user.id)
    .maybeSingle()

  if (profile?.role !== 'commissioner') redirect('/')
  return { user, db: createServiceClient() }
}

// Pull mock schedule + lines for a week (MOCK_ODDS=true path)
export async function pullLinesAction(weekNumber: number, seasonYear: number) {
  await requireCommissioner()
  const db = createServiceClient()

  const now = new Date()
  const daysUntilThursday = (4 - now.getDay() + 7) % 7 || 7
  const thursday = new Date(now)
  thursday.setDate(now.getDate() + daysUntilThursday)
  thursday.setUTCHours(0, 20, 20, 0)

  const sunday = new Date(thursday)
  sunday.setDate(thursday.getDate() + 3)

  const t = (h: number, m: number) => { const d = new Date(thursday); d.setUTCHours(h, m, 0, 0); return d.toISOString() }
  const s = (h: number, m: number) => { const d = new Date(sunday); d.setUTCHours(h, m, 0, 0); return d.toISOString() }

  const mockGames = [
    { home_team: 'CIN', away_team: 'BAL', spread: 1.5, spread_favorite: 'away', kickoff_time: t(0, 20), day: 'thursday', is_tiebreaker: false, external_id: `w${weekNumber}_1` },
    { home_team: 'NE',  away_team: 'BUF', spread: 3.0, spread_favorite: 'away', kickoff_time: s(18, 0),  day: 'sunday',   is_tiebreaker: false, external_id: `w${weekNumber}_2` },
    { home_team: 'IND', away_team: 'NYJ', spread: 3.0, spread_favorite: 'home', kickoff_time: s(18, 0),  day: 'sunday',   is_tiebreaker: false, external_id: `w${weekNumber}_3` },
    { home_team: 'HOU', away_team: 'JAX', spread: 2.5, spread_favorite: 'home', kickoff_time: s(18, 0),  day: 'sunday',   is_tiebreaker: false, external_id: `w${weekNumber}_4` },
    { home_team: 'NO',  away_team: 'CAR', spread: 4.5, spread_favorite: 'home', kickoff_time: s(18, 0),  day: 'sunday',   is_tiebreaker: false, external_id: `w${weekNumber}_5` },
    { home_team: 'DET', away_team: 'CHI', spread: 7.0, spread_favorite: 'home', kickoff_time: s(18, 0),  day: 'sunday',   is_tiebreaker: false, external_id: `w${weekNumber}_6` },
    { home_team: 'NYG', away_team: 'GB',  spread: 5.5, spread_favorite: 'away', kickoff_time: s(18, 0),  day: 'sunday',   is_tiebreaker: false, external_id: `w${weekNumber}_7` },
    { home_team: 'DAL', away_team: 'PHI', spread: 1.0, spread_favorite: 'away', kickoff_time: s(18, 0),  day: 'sunday',   is_tiebreaker: false, external_id: `w${weekNumber}_8` },
    { home_team: 'TEN', away_team: 'PIT', spread: 4.0, spread_favorite: 'away', kickoff_time: s(18, 0),  day: 'sunday',   is_tiebreaker: false, external_id: `w${weekNumber}_9` },
    { home_team: 'ATL', away_team: 'ARI', spread: 3.0, spread_favorite: 'home', kickoff_time: s(18, 0),  day: 'sunday',   is_tiebreaker: false, external_id: `w${weekNumber}_10` },
    { home_team: 'DEN', away_team: 'LV',  spread: 3.5, spread_favorite: 'home', kickoff_time: s(21, 25), day: 'sunday',   is_tiebreaker: false, external_id: `w${weekNumber}_11` },
    { home_team: 'KC',  away_team: 'LAC', spread: 6.5, spread_favorite: 'home', kickoff_time: s(21, 25), day: 'sunday',   is_tiebreaker: false, external_id: `w${weekNumber}_12` },
    { home_team: 'WAS', away_team: 'TB',  spread: 2.5, spread_favorite: 'home', kickoff_time: s(21, 25), day: 'sunday',   is_tiebreaker: false, external_id: `w${weekNumber}_13` },
    { home_team: 'LAR', away_team: 'SEA', spread: 2.5, spread_favorite: 'home', kickoff_time: s(21, 25), day: 'sunday',   is_tiebreaker: false, external_id: `w${weekNumber}_14` },
    { home_team: 'MIN', away_team: 'SF',  spread: 1.0, spread_favorite: 'away', kickoff_time: s(21, 25), day: 'sunday',   is_tiebreaker: false, external_id: `w${weekNumber}_15` },
    { home_team: 'MIA', away_team: 'CLE', spread: 2.5, spread_favorite: 'home', kickoff_time: s(1, 20),  day: 'sunday',   is_tiebreaker: false, external_id: `w${weekNumber}_16` },
  ]

  // Upsert week
  const { data: week, error } = await db
    .from('weeks')
    .upsert(
      { week_number: weekNumber, season_year: seasonYear, status: 'pending' },
      { onConflict: 'week_number,season_year' }
    )
    .select()
    .single()

  if (error || !week) throw new Error(`Failed to create week: ${error?.message}`)

  // Replace existing non-tiebreaker games
  await db.from('games').delete().eq('week_id', week.id).eq('is_tiebreaker', false)
  const { error: gamesError } = await db.from('games').insert(
    mockGames.map((g) => ({ ...g, week_id: week.id }))
  )
  if (gamesError) throw new Error(`Failed to save games: ${gamesError.message}`)
}

// Update a game's spread (commissioner review mode)
export async function updateSpreadAction(gameId: string, spread: number) {
  const { db } = await requireCommissioner()

  // spread comes in as mock format (negative = home favored)
  // Convert back to DB format: always positive + spread_favorite
  const dbSpread = Math.abs(spread)
  const spreadFavorite = spread < 0 ? 'home' : 'away'

  await db.from('games').update({ spread: dbSpread, spread_favorite: spreadFavorite }).eq('id', gameId)
}

// Publish week slate — opens picks for the league
export async function publishSlateAction(weekId: string, message: string) {
  const { user, db } = await requireCommissioner()

  await db.from('weeks').update({ status: 'open' }).eq('id', weekId)
  await db.from('announcements').insert({
    week_id: weekId,
    author_id: user.id,
    type: 'slate',
    content: message.trim() || `Week slate is live. Pick 6 of 16 before kickoff.`,
  })
}
