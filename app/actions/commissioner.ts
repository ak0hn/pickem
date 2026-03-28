'use server'

import { revalidatePath } from 'next/cache'
import { createServiceClient } from '@/lib/supabase/server'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import {
  getMockSchedule,
  getMockGames,
  getMockScores,
  getMockMNFGame,
  getMockMNFScore,
  parseOddsApiGames,
} from '@/lib/nfl/mock-data'

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

// ─── ATS result computation ───────────────────────────────────────────────────

function computeATSResult(
  homeScore: number,
  awayScore: number,
  spread: number,
  spreadFavorite: string
): 'home_win' | 'away_win' | 'push' {
  if (spread === 0) {
    if (homeScore > awayScore) return 'home_win'
    if (awayScore > homeScore) return 'away_win'
    return 'push'
  }
  if (spreadFavorite === 'home') {
    const margin = homeScore - awayScore
    if (margin > spread) return 'home_win'
    if (margin < spread) return 'away_win'
    return 'push'
  } else {
    const margin = awayScore - homeScore
    if (margin > spread) return 'away_win'
    if (margin < spread) return 'home_win'
    return 'push'
  }
}

// ─── Shared: score picks for a game ──────────────────────────────────────────

async function scorePicksForGame(
  db: ReturnType<typeof createServiceClient>,
  gameId: string,
  gameResult: 'home_win' | 'away_win' | 'push'
) {
  const { data: picks } = await db.from('picks').select('id, picked_team').eq('game_id', gameId)
  for (const pick of picks ?? []) {
    const result =
      gameResult === 'push' ? 'push'
      : gameResult === 'home_win' ? (pick.picked_team === 'home' ? 'win' : 'loss')
      : (pick.picked_team === 'away' ? 'win' : 'loss')
    await db.from('picks').update({ result }).eq('id', pick.id)
  }
}

// ─── Shared: upsert week + populate games ────────────────────────────────────

async function upsertWeekWithGames(
  db: ReturnType<typeof createServiceClient>,
  weekNumber: number,
  seasonYear: number,
  games: any[]
) {
  const { data: week, error } = await db
    .from('weeks')
    .upsert(
      { week_number: weekNumber, season_year: seasonYear, status: 'pending' },
      { onConflict: 'week_number,season_year' }
    )
    .select()
    .single()

  if (error || !week) throw new Error('Failed to create week')

  await db.from('games').delete().eq('week_id', week.id).eq('is_tiebreaker', false)
  const { error: gamesError } = await db.from('games').insert(
    games.map((g) => ({ ...g, week_id: week.id }))
  )
  if (gamesError) throw new Error('Failed to save games')

  return week
}

// ─── Fetch schedule (teams + times, no spreads) ───────────────────────────────

export async function fetchSchedule(weekNumber: number, seasonYear: number) {
  await requireCommissioner()
  const db = createServiceClient()

  let games
  if (process.env.MOCK_ODDS === 'true') {
    games = getMockSchedule()
  } else {
    const { fetchNFLOdds } = await import('@/lib/odds-api/client')
    const oddsData = await fetchNFLOdds()
    games = parseOddsApiGames(oddsData).map((g) => ({ ...g, spread: 0, spread_favorite: 'home' as const }))
  }

  await upsertWeekWithGames(db, weekNumber, seasonYear, games)

  revalidatePath('/commissioner')
  revalidatePath('/week')
}

// ─── Fetch lines (update spreads on existing games) ───────────────────────────

export async function fetchAndSaveLines(weekNumber: number, seasonYear: number) {
  await requireCommissioner()
  const db = createServiceClient()

  let games
  if (process.env.MOCK_ODDS === 'true') {
    games = getMockGames()
  } else {
    const { fetchNFLOdds } = await import('@/lib/odds-api/client')
    games = parseOddsApiGames(await fetchNFLOdds())
  }

  // Try to update spreads on existing games; recreate if none exist
  const { data: weekRow } = await db
    .from('weeks')
    .select('id')
    .eq('week_number', weekNumber)
    .eq('season_year', seasonYear)
    .maybeSingle()

  const { data: existing } = weekRow
    ? await db.from('games').select('id, external_id, home_team, away_team').eq('week_id', weekRow.id).eq('is_tiebreaker', false)
    : { data: null }

  if (existing && existing.length > 0) {
    for (const game of games) {
      const match =
        existing.find((eg: any) => eg.external_id === game.external_id) ??
        existing.find((eg: any) => eg.home_team === game.home_team && eg.away_team === game.away_team)
      if (match) {
        await db.from('games')
          .update({ spread: game.spread, spread_favorite: game.spread_favorite })
          .eq('id', match.id)
      }
    }
  } else {
    await upsertWeekWithGames(db, weekNumber, seasonYear, games)
  }

  revalidatePath('/commissioner')
  revalidatePath('/week')
}

// ─── Publish week (open picks) ────────────────────────────────────────────────

export async function publishWeek(weekId: string, message: string) {
  const user = await requireCommissioner()
  const db = createServiceClient()

  await db.from('weeks').update({ status: 'open' }).eq('id', weekId)
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

// ─── Fetch results ────────────────────────────────────────────────────────────

export async function fetchResults(weekId: string) {
  await requireCommissioner()
  const db = createServiceClient()

  const { data: games } = await db
    .from('games')
    .select('id, external_id, spread, spread_favorite')
    .eq('week_id', weekId)
    .eq('is_tiebreaker', false)

  if (!games || games.length === 0) throw new Error('No games found for this week')

  let scores: Array<{ external_id: string; home_score: number; away_score: number }>

  if (process.env.MOCK_ODDS === 'true') {
    scores = getMockScores()
  } else {
    const { fetchNFLScores } = await import('@/lib/odds-api/client')
    const raw = await fetchNFLScores(2)
    scores = (raw as any[])
      .filter((s) => s.completed)
      .map((s) => ({
        external_id: s.id,
        home_score: parseInt(s.scores?.find((sc: any) => sc.name === s.home_team)?.score ?? '0'),
        away_score: parseInt(s.scores?.find((sc: any) => sc.name === s.away_team)?.score ?? '0'),
      }))
  }

  let updatedCount = 0
  for (const game of games) {
    const score = scores.find((s) => s.external_id === (game as any).external_id)
    if (!score) continue
    const result = computeATSResult(score.home_score, score.away_score, (game as any).spread, (game as any).spread_favorite)
    await db.from('games').update({ result, result_confirmed: true }).eq('id', game.id)
    await scorePicksForGame(db, game.id, result)
    updatedCount++
  }

  if (updatedCount === 0) throw new Error('No completed game scores found yet — try again after all games have ended.')

  await db.from('weeks').update({ status: 'sunday_complete' }).eq('id', weekId)

  revalidatePath('/commissioner')
  revalidatePath('/week')
  revalidatePath('/standings')
  revalidatePath('/home')
}

// ─── Results announcement (gates close or tiebreaker) ────────────────────────

export async function postResultsAnnouncement(weekId: string, content: string) {
  const user = await requireCommissioner()
  const db = createServiceClient()

  const { data: games } = await db.from('games').select('id').eq('week_id', weekId).eq('is_tiebreaker', false)
  const gameIds = (games ?? []).map((g: any) => g.id)
  const { data: picks } = await db.from('picks').select('user_id, result').in('game_id', gameIds)

  const byUser: Record<string, string[]> = {}
  for (const p of picks ?? []) {
    if (!byUser[p.user_id]) byUser[p.user_id] = []
    byUser[p.user_id].push(p.result)
  }

  const perfectCount = Object.values(byUser).filter(
    (results) => results.length > 0 && results.every((r) => r === 'win')
  ).length

  const { data: league } = await db.from('league').select('tiebreaker_threshold').limit(1).maybeSingle()
  const threshold = league?.tiebreaker_threshold ?? 1

  await db.from('announcements').insert({ week_id: weekId, author_id: user.id, type: 'results', content: content.trim() })
  await db.from('weeks').update({ status: perfectCount > threshold ? 'tiebreaker' : 'results_posted' }).eq('id', weekId)

  revalidatePath('/commissioner')
  revalidatePath('/home')
  revalidatePath('/standings')
  revalidatePath('/week')
}

// ─── Tiebreaker: fetch MNF line ───────────────────────────────────────────────

export async function fetchMNFLine(weekId: string) {
  await requireCommissioner()
  const db = createServiceClient()

  await db.from('games').delete().eq('week_id', weekId).eq('is_tiebreaker', true)

  let mnfGame
  if (process.env.MOCK_ODDS === 'true') {
    mnfGame = getMockMNFGame()
  } else {
    const { fetchNFLOdds } = await import('@/lib/odds-api/client')
    const oddsData = await fetchNFLOdds()
    const mondayGames = (oddsData as any[]).filter((e) => new Date(e.commence_time).getDay() === 1)
    if (mondayGames.length === 0) throw new Error('No Monday Night Football game found this week')

    const event = mondayGames[0]
    const spreadsMarket = event.bookmakers?.[0]?.markets?.find((m: any) => m.key === 'spreads')
    if (!spreadsMarket) throw new Error('No spread available for MNF yet — try again closer to game time')

    const homeOutcome = spreadsMarket.outcomes.find((o: any) => o.name === event.home_team)
    if (!homeOutcome) throw new Error('Could not parse MNF spread')

    const homeSpread = homeOutcome.point
    mnfGame = {
      home_team: event.home_team,
      away_team: event.away_team,
      spread: Math.abs(homeSpread),
      spread_favorite: homeSpread < 0 ? 'home' : 'away',
      kickoff_time: new Date(event.commence_time).toISOString(),
      day: 'monday',
      is_tiebreaker: true,
      external_id: event.id,
    }
  }

  await db.from('games').insert({ ...mnfGame, week_id: weekId })
  revalidatePath('/commissioner')
}

// ─── Tiebreaker: post launch announcement (opens MNF picks) ──────────────────

export async function postTiebreakerAnnouncement(weekId: string, content: string) {
  const user = await requireCommissioner()
  const db = createServiceClient()

  await db.from('announcements').insert({ week_id: weekId, author_id: user.id, type: 'tiebreaker', content: content.trim() })

  revalidatePath('/commissioner')
  revalidatePath('/home')
  revalidatePath('/week')
}

// ─── Tiebreaker: fetch MNF result ─────────────────────────────────────────────

export async function fetchMNFResult(weekId: string) {
  await requireCommissioner()
  const db = createServiceClient()

  const { data: tbGame } = await db
    .from('games')
    .select('id, external_id, spread, spread_favorite')
    .eq('week_id', weekId)
    .eq('is_tiebreaker', true)
    .maybeSingle()

  if (!tbGame) throw new Error('No tiebreaker game found')

  let homeScore: number, awayScore: number

  if (process.env.MOCK_ODDS === 'true') {
    const mock = getMockMNFScore()
    homeScore = mock.home_score
    awayScore = mock.away_score
  } else {
    const { fetchNFLScores } = await import('@/lib/odds-api/client')
    const raw = await fetchNFLScores(1)
    const found = (raw as any[]).find((s) => s.id === (tbGame as any).external_id)
    if (!found || !found.completed) throw new Error('MNF result not yet available — try again after the game ends')
    homeScore = parseInt(found.scores?.find((sc: any) => sc.name === found.home_team)?.score ?? '0')
    awayScore = parseInt(found.scores?.find((sc: any) => sc.name === found.away_team)?.score ?? '0')
  }

  const result = computeATSResult(homeScore, awayScore, (tbGame as any).spread, (tbGame as any).spread_favorite)
  await db.from('games').update({ result, result_confirmed: true }).eq('id', tbGame.id)

  revalidatePath('/commissioner')
  revalidatePath('/week')
  revalidatePath('/standings')
}

// ─── Tiebreaker: post results announcement (closes week) ─────────────────────

export async function postTiebreakerResults(weekId: string, content: string) {
  const user = await requireCommissioner()
  const db = createServiceClient()

  await db.from('announcements').insert({ week_id: weekId, author_id: user.id, type: 'results', content: content.trim() })
  await db.from('weeks').update({ status: 'results_posted' }).eq('id', weekId)

  revalidatePath('/commissioner')
  revalidatePath('/home')
  revalidatePath('/standings')
  revalidatePath('/week')
}

// ─── General announcement ─────────────────────────────────────────────────────

export async function postAnnouncement(weekId: string | null, content: string, type: string = 'general') {
  const user = await requireCommissioner()
  const db = createServiceClient()
  await db.from('announcements').insert({ week_id: weekId, author_id: user.id, type, content })
  revalidatePath('/home')
  revalidatePath('/commissioner')
}

// ─── Spread override ──────────────────────────────────────────────────────────

export async function updateGameSpread(gameId: string, spread: number, spreadFavorite: 'home' | 'away') {
  await requireCommissioner()
  const db = createServiceClient()
  const { error } = await db.from('games').update({ spread, spread_favorite: spreadFavorite }).eq('id', gameId)
  if (error) throw new Error('Failed to update spread')
  revalidatePath('/commissioner')
}

// ─── League settings ──────────────────────────────────────────────────────────

export async function updatePushCountsAs(value: 'win' | 'tie') {
  await requireCommissioner()
  const db = createServiceClient()
  const { data: league } = await db.from('league').select('id').limit(1).maybeSingle()
  if (league) {
    await db.from('league').update({ push_counts_as: value }).eq('id', league.id)
  } else {
    await db.from('league').insert({ name: "Pick'em League", season_year: new Date().getFullYear(), push_counts_as: value })
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
    await db.from('league').insert({ name: "Pick'em League", season_year: new Date().getFullYear(), fetch_hours_before_kickoff: hours })
  }
  revalidatePath('/commissioner/league')
}

// ─── Player invites ───────────────────────────────────────────────────────────

export async function invitePlayer(email: string) {
  const user = await requireCommissioner()
  const db = createServiceClient()

  const { data: existing } = await db.from('invites').select('id').eq('email', email).maybeSingle()
  if (existing) throw new Error('Player already invited')

  const { data: existingUser } = await db.from('users').select('id').eq('email', email).maybeSingle()
  if (existingUser) throw new Error('Player already in league')

  const { data: invite, error } = await db.from('invites').insert({ email, invited_by: user.id }).select().single()
  if (error) throw new Error('Failed to create invite')

  revalidatePath('/commissioner/league')
  return invite
}

// ─── Dev only ─────────────────────────────────────────────────────────────────

function devGuard() {
  if (process.env.MOCK_ODDS !== 'true') throw new Error('Only available in mock/dev mode')
}

// Shared setup used by Sunday and Tiebreaker sims
async function devSetupSundayComplete(db: ReturnType<typeof createServiceClient>, weekId: string, authorId: string) {
  const games = getMockGames()
  await db.from('games').insert(games.map((g) => ({ ...g, week_id: weekId })))
  await db.from('announcements').insert({ week_id: weekId, author_id: authorId, type: 'slate', content: '[Dev sim] Slate posted.' })

  const { data: inserted } = await db.from('games').select('id, external_id, spread, spread_favorite').eq('week_id', weekId).eq('is_tiebreaker', false)
  for (const game of inserted ?? []) {
    const score = getMockScores().find((s) => s.external_id === (game as any).external_id)
    if (!score) continue
    const result = computeATSResult(score.home_score, score.away_score, (game as any).spread, (game as any).spread_favorite)
    await db.from('games').update({ result, result_confirmed: true }).eq('id', game.id)
  }
}

// Sim 1 — Reset: wipe picks/announcements, restore schedule (no lines yet)
export async function devResetWeekToWednesday(weekId: string) {
  devGuard()
  await requireCommissioner()
  const db = createServiceClient()

  await db.from('picks').delete().eq('week_id', weekId)
  await db.from('announcements').delete().eq('week_id', weekId)
  await db.from('games').delete().eq('week_id', weekId)
  await db.from('games').insert(getMockSchedule().map((g) => ({ ...g, week_id: weekId })))
  await db.from('weeks').update({ status: 'pending' }).eq('id', weekId)

  revalidatePath('/commissioner')
  revalidatePath('/week')
  revalidatePath('/home')
}

// Sim 1b — Thursday result: score Thursday game + picks, week stays open
export async function devScoreThursdayGame(weekId: string) {
  devGuard()
  await requireCommissioner()
  const db = createServiceClient()

  const { data: thursdayGame } = await db
    .from('games')
    .select('id, external_id, spread, spread_favorite')
    .eq('week_id', weekId)
    .eq('day', 'thursday')
    .eq('is_tiebreaker', false)
    .maybeSingle()

  if (!thursdayGame) throw new Error('No Thursday game found')

  const score = getMockScores().find((s) => s.external_id === (thursdayGame as any).external_id)
  if (!score) throw new Error('No mock score for Thursday game')

  const result = computeATSResult(score.home_score, score.away_score, (thursdayGame as any).spread, (thursdayGame as any).spread_favorite)
  await db.from('games').update({ result, result_confirmed: true }).eq('id', thursdayGame.id)
  await scorePicksForGame(db, thursdayGame.id, result)

  revalidatePath('/commissioner')
  revalidatePath('/week')
}

// Sim: Pre-SNF — score all Sunday games except the last kickoff (SNF)
export async function devScorePreSNFGames(weekId: string) {
  devGuard()
  await requireCommissioner()
  const db = createServiceClient()

  const { data: sundayGames } = await db
    .from('games')
    .select('id, external_id, spread, spread_favorite, kickoff_time')
    .eq('week_id', weekId)
    .eq('day', 'sunday')
    .eq('is_tiebreaker', false)
    .order('kickoff_time', { ascending: true })

  if (!sundayGames || sundayGames.length === 0) throw new Error('No Sunday games found')

  const snfKickoff = sundayGames[sundayGames.length - 1].kickoff_time
  const preSNF = sundayGames.filter((g: any) => g.kickoff_time < snfKickoff)

  for (const game of preSNF) {
    const score = getMockScores().find((s) => s.external_id === (game as any).external_id)
    if (!score) continue
    const result = computeATSResult(score.home_score, score.away_score, (game as any).spread, (game as any).spread_favorite)
    await db.from('games').update({ result, result_confirmed: true }).eq('id', game.id)
    await scorePicksForGame(db, game.id, result)
  }

  revalidatePath('/commissioner')
  revalidatePath('/week')
}

// Sim: SNF final — score remaining games, move to sunday_complete
export async function devCompleteWeek(weekId: string) {
  devGuard()
  await requireCommissioner()
  const db = createServiceClient()

  const { data: unscoredGames } = await db
    .from('games')
    .select('id, external_id, spread, spread_favorite')
    .eq('week_id', weekId)
    .eq('is_tiebreaker', false)
    .neq('result_confirmed', true)

  for (const game of unscoredGames ?? []) {
    const score = getMockScores().find((s) => s.external_id === (game as any).external_id)
    if (!score) continue
    const result = computeATSResult(score.home_score, score.away_score, (game as any).spread, (game as any).spread_favorite)
    await db.from('games').update({ result, result_confirmed: true }).eq('id', game.id)
    await scorePicksForGame(db, game.id, result)
  }

  await db.from('weeks').update({ status: 'sunday_complete' }).eq('id', weekId)

  revalidatePath('/commissioner')
  revalidatePath('/week')
  revalidatePath('/home')
}

// Sim: Next Wednesday — close current week, start next with schedule
export async function devAdvanceToNextWeek(weekId: string, weekNumber: number, seasonYear: number) {
  devGuard()
  await requireCommissioner()
  const db = createServiceClient()

  await db.from('weeks').update({ status: 'closed' }).eq('id', weekId)

  const next = weekNumber + 1
  if (next <= 18) {
    await upsertWeekWithGames(db, next, seasonYear, getMockSchedule())
  }

  revalidatePath('/commissioner')
  revalidatePath('/week')
  revalidatePath('/home')
}

// Sim 3 — Sunday done: results scored → sunday_complete
export async function devSimulateSundayDone(weekId: string, seasonYear: number) {
  devGuard()
  const user = await requireCommissioner()
  const db = createServiceClient()

  await db.from('picks').delete().eq('week_id', weekId)
  await db.from('announcements').delete().eq('week_id', weekId)
  await db.from('games').delete().eq('week_id', weekId)
  await devSetupSundayComplete(db, weekId, user.id)
  await db.from('weeks').update({ status: 'sunday_complete' }).eq('id', weekId)

  revalidatePath('/commissioner')
  revalidatePath('/week')
  revalidatePath('/home')
}

// Sim 4 — Tiebreaker: results posted, MNF tiebreaker triggered
export async function devSimulateTiebreaker(weekId: string, seasonYear: number) {
  devGuard()
  const user = await requireCommissioner()
  const db = createServiceClient()

  await db.from('picks').delete().eq('week_id', weekId)
  await db.from('announcements').delete().eq('week_id', weekId)
  await db.from('games').delete().eq('week_id', weekId)
  await devSetupSundayComplete(db, weekId, user.id)
  await db.from('announcements').insert({ week_id: weekId, author_id: user.id, type: 'results', content: '[Dev sim] Results in — tiebreaker triggered.' })
  await db.from('weeks').update({ status: 'tiebreaker' }).eq('id', weekId)

  revalidatePath('/commissioner')
  revalidatePath('/week')
  revalidatePath('/home')
}
