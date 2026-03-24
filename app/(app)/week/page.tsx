import { createClient } from '@/lib/supabase/server'
import WeekPicks from '@/components/WeekPicks'

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

  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Fetch the most recent open or pending week
  const { data: weeks } = await supabase
    .from('weeks')
    .select('*')
    .in('status', ['open', 'pending'])
    .order('week_number', { ascending: false })
    .limit(1)

  const week: Week | null = weeks?.[0] ?? null
  const canPick = week?.status === 'open'

  if (!week) {
    return (
      <div className="p-4 flex flex-col items-center justify-center min-h-[60vh] text-center">
        <div className="text-4xl mb-4">🏈</div>
        <h2 className="text-xl font-bold text-white mb-2">No active week</h2>
        <p className="text-gray-400 max-w-xs">
          No picks available this week. Check back Thursday when the
          commissioner posts the slate.
        </p>
      </div>
    )
  }

  // Fetch games for this week (non-tiebreaker), ordered by kickoff time
  const { data: games } = await supabase
    .from('games')
    .select('*')
    .eq('week_id', week.id)
    .eq('is_tiebreaker', false)
    .order('kickoff_time', { ascending: true })

  // Fetch user's existing picks for this week
  const { data: picksRaw } = user
    ? await supabase
        .from('picks')
        .select('*')
        .eq('user_id', user.id)
        .in(
          'game_id',
          (games ?? []).map((g: Game) => g.id)
        )
    : { data: [] }

  // Build a map of game_id → pick
  const userPicks: Record<string, Pick> = {}
  for (const pick of picksRaw ?? []) {
    userPicks[pick.game_id] = pick as Pick
  }

  // Fetch league settings for pick count
  const { data: settings } = await supabase
    .from('league_settings')
    .select('pick_count')
    .limit(1)
    .maybeSingle()

  const pickCount: number = settings?.pick_count ?? 6

  return (
    <WeekPicks
      week={week}
      games={(games ?? []) as Game[]}
      userPicks={userPicks}
      userId={user?.id ?? null}
      pickCount={pickCount}
      canPick={canPick}
    />
  )
}
