import { createClient, createServiceClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import WeekPicks from '@/components/WeekPicks'
import TiebreakerView from '@/components/TiebreakerView'

export type Week = {
  id: string
  week_number: number
  season_year: number
  status: string
  thursday_kickoff: string | null
}

export type Game = {
  id: string
  week_id: string
  home_team: string
  away_team: string
  spread: number
  spread_favorite: string
  kickoff_time: string
  day: string
  is_tiebreaker: boolean
  result: string
  result_confirmed: boolean
}

export type Pick = {
  id: string
  game_id: string
  picked_team: 'home' | 'away'
  result: string
  locked_at: string | null
}

export default async function WeekPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const db = createServiceClient()

  // Always show the most recent non-closed week — slate is visible regardless of status
  const { data: weeks } = await db
    .from('weeks')
    .select('*')
    .neq('status', 'closed')
    .order('week_number', { ascending: false })
    .limit(1)

  const week: Week | null = weeks?.[0] ?? null
  const canPick = week?.status === 'open'
  // Spreads are revealed to players only when picks are open (commissioner published)
  const spreadsVisible = week?.status !== 'pending'

  if (!week) {
    return (
      <div className="p-4 flex flex-col items-center justify-center min-h-[60vh] text-center">
        <h2 className="text-xl font-bold text-white mb-2">Off-season</h2>
        <p className="text-gray-400 max-w-xs">
          No active week. Check back when the new season kicks off.
        </p>
      </div>
    )
  }

  // Regular games (non-tiebreaker), Thu–SNF only — MNF reserved for tiebreaker
  const { data: gamesRaw } = await db
    .from('games')
    .select('*')
    .eq('week_id', week.id)
    .eq('is_tiebreaker', false)
    .order('kickoff_time', { ascending: true })

  // Mask spreads from players until commissioner publishes
  const games = (gamesRaw ?? []).map((g: Game) =>
    spreadsVisible ? g : { ...g, spread: 0, spread_favorite: 'home' }
  )

  // User's existing picks for regular games
  const { data: picksRaw } = await db
    .from('picks')
    .select('*')
    .eq('user_id', user.id)
    .in('game_id', games.map((g: Game) => g.id))

  const userPicks: Record<string, Pick> = {}
  for (const pick of picksRaw ?? []) {
    userPicks[pick.game_id] = pick as Pick
  }

  // League pick count setting
  const { data: settings } = await db
    .from('league')
    .select('pick_count')
    .limit(1)
    .maybeSingle()

  const pickCount: number = settings?.pick_count ?? 6

  // ── Tiebreaker data ──────────────────────────────────────────────────────────

  let tiebreakerGame: Game | null = null
  let isEligible = false
  let tiebreakerPick: { picked_team: 'home' | 'away'; result: string } | null = null
  let homeVotes = 0
  let awayVotes = 0
  let totalVotes = 0
  let tiebreakerPicksOpen = false

  if (week.status === 'tiebreaker') {
    // Check if the tiebreaker announcement has been posted (picks are open)
    const { data: tbAnnouncement } = await db
      .from('announcements')
      .select('id')
      .eq('week_id', week.id)
      .eq('type', 'tiebreaker')
      .maybeSingle()

    tiebreakerPicksOpen = !!tbAnnouncement

    if (tiebreakerPicksOpen) {
      // Fetch the tiebreaker game
      const { data: tbGame } = await db
        .from('games')
        .select('*')
        .eq('week_id', week.id)
        .eq('is_tiebreaker', true)
        .maybeSingle()

      tiebreakerGame = tbGame ?? null

      if (tiebreakerGame) {
        // Eligibility: did the user go perfect on all non-tiebreaker picks?
        const weekGameIds = games.map((g: Game) => g.id)
        const { data: eligibilityPicks } = await db
          .from('picks')
          .select('result')
          .eq('user_id', user.id)
          .in('game_id', weekGameIds)

        isEligible =
          (eligibilityPicks ?? []).length > 0 &&
          (eligibilityPicks ?? []).every((p: any) => p.result === 'win')

        // User's tiebreaker pick
        const { data: tbPickRaw } = await db
          .from('picks')
          .select('picked_team, result')
          .eq('user_id', user.id)
          .eq('game_id', tiebreakerGame.id)
          .maybeSingle()

        tiebreakerPick = tbPickRaw
          ? { picked_team: tbPickRaw.picked_team as 'home' | 'away', result: tbPickRaw.result }
          : null

        // Vote tally (shown to non-eligible players)
        if (!isEligible) {
          const { data: allTbPicks } = await db
            .from('picks')
            .select('picked_team')
            .eq('game_id', tiebreakerGame.id)

          for (const p of allTbPicks ?? []) {
            if (p.picked_team === 'home') homeVotes++
            else if (p.picked_team === 'away') awayVotes++
          }
          totalVotes = homeVotes + awayVotes
        }
      }
    }
  }

  return (
    <div className="space-y-4">
      <WeekPicks
        week={week}
        games={games as Game[]}
        userPicks={userPicks}
        userId={user.id}
        pickCount={pickCount}
        canPick={canPick}
      />

      {/* Tiebreaker section — shown when picks are open */}
      {week.status === 'tiebreaker' && tiebreakerPicksOpen && tiebreakerGame && (
        <div className="px-4 pb-4">
          <TiebreakerView
            game={tiebreakerGame}
            weekId={week.id}
            userId={user.id}
            isEligible={isEligible}
            existingPick={tiebreakerPick}
            homeVotes={homeVotes}
            awayVotes={awayVotes}
            totalVotes={totalVotes}
          />
        </div>
      )}
    </div>
  )
}
