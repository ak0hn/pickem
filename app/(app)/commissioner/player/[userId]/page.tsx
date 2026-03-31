import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { getTeam } from '@/lib/nfl/teams'

function formatDay(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', {
    timeZone: 'America/New_York',
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  })
}

function formatTime(iso: string) {
  return new Date(iso)
    .toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
      timeZone: 'America/New_York',
    })
    .replace(':00', '')
    .toLowerCase() + ' ET'
}

function spreadLabel(spread: number, isFav: boolean) {
  if (spread === 0) return '—'
  return isFav ? `-${spread}` : `+${spread}`
}

export default async function PlayerPicksPage({
  params,
  searchParams,
}: {
  params: Promise<{ userId: string }>
  searchParams: Promise<{ week?: string }>
}) {
  const { userId } = await params
  const { week: weekParam } = await searchParams

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const db = createServiceClient()

  // Verify requester is commissioner
  const { data: requester } = await db
    .from('users')
    .select('role')
    .eq('id', user.id)
    .maybeSingle()

  if (requester?.role !== 'commissioner') redirect('/home')

  // Fetch the player being viewed
  const { data: player } = await db
    .from('users')
    .select('id, name')
    .eq('id', userId)
    .maybeSingle()

  if (!player) redirect('/commissioner')

  // Fetch all non-closed weeks, ordered
  const { data: allWeeks } = await db
    .from('weeks')
    .select('id, week_number, season_year, status')
    .order('week_number', { ascending: true })

  const weeks = (allWeeks ?? []).filter((w) => w.status !== 'closed' || weekParam)

  // Find the active week (first non-closed) as default
  const activeWeek = (allWeeks ?? []).find((w) => w.status !== 'closed') ?? allWeeks?.[allWeeks.length - 1] ?? null

  // Resolve selected week
  const selectedWeekNumber = weekParam ? parseInt(weekParam, 10) : activeWeek?.week_number ?? 1
  const selectedWeek = (allWeeks ?? []).find((w) => w.week_number === selectedWeekNumber) ?? activeWeek

  // Prev/next week numbers (only weeks that exist)
  const allWeekNumbers = (allWeeks ?? []).map((w) => w.week_number)
  const currentIdx = allWeekNumbers.indexOf(selectedWeekNumber)
  const prevWeekNum = currentIdx > 0 ? allWeekNumbers[currentIdx - 1] : null
  const nextWeekNum = currentIdx < allWeekNumbers.length - 1 ? allWeekNumbers[currentIdx + 1] : null

  // Fetch games for selected week
  const { data: games } = selectedWeek
    ? await db
        .from('games')
        .select('*')
        .eq('week_id', selectedWeek.id)
        .eq('is_tiebreaker', false)
        .order('kickoff_time', { ascending: true })
    : { data: [] }

  const gameIds = (games ?? []).map((g: any) => g.id)

  // Fetch this player's picks for these games
  const { data: picks } = gameIds.length > 0
    ? await db
        .from('picks')
        .select('game_id, picked_team, result')
        .eq('user_id', userId)
        .in('game_id', gameIds)
    : { data: [] }

  const pickMap = Object.fromEntries(
    (picks ?? []).map((p: any) => [p.game_id, p])
  )

  // Group games by day
  const dayMap = new Map<string, any[]>()
  for (const game of games ?? []) {
    const label = formatDay(game.kickoff_time)
    if (!dayMap.has(label)) dayMap.set(label, [])
    dayMap.get(label)!.push(game)
  }

  // Score summary
  const totalPicks = (picks ?? []).length
  const wins = (picks ?? []).filter((p: any) => p.result === 'win').length
  const losses = (picks ?? []).filter((p: any) => p.result === 'loss').length
  const hasResults = (picks ?? []).some((p: any) => p.result !== 'pending' && p.result !== null)

  return (
    <div className="p-4 space-y-5">
      {/* Back link */}
      <Link
        href="/commissioner"
        className="inline-flex items-center gap-1 text-xs text-gray-500 active:text-gray-300"
      >
        ← Commissioner
      </Link>

      {/* Player header + week nav */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-white">{player.name}</h1>

        <div className="flex items-center gap-3">
          {prevWeekNum !== null ? (
            <Link
              href={`/commissioner/player/${userId}?week=${prevWeekNum}`}
              className="text-gray-400 active:text-white text-sm font-semibold px-2 py-1"
            >
              ‹
            </Link>
          ) : (
            <span className="text-gray-700 text-sm font-semibold px-2 py-1">‹</span>
          )}

          <span className="text-sm font-semibold text-white tabular-nums">
            Week {selectedWeekNumber}
          </span>

          {nextWeekNum !== null ? (
            <Link
              href={`/commissioner/player/${userId}?week=${nextWeekNum}`}
              className="text-gray-400 active:text-white text-sm font-semibold px-2 py-1"
            >
              ›
            </Link>
          ) : (
            <span className="text-gray-700 text-sm font-semibold px-2 py-1">›</span>
          )}
        </div>
      </div>

      {/* No games yet */}
      {(games ?? []).length === 0 && (
        <div className="text-sm text-gray-600 text-center py-8">
          No games scheduled for Week {selectedWeekNumber}.
        </div>
      )}

      {/* Games by day */}
      {(games ?? []).length > 0 && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl px-4 divide-y divide-gray-800/60">
          {Array.from(dayMap.entries()).map(([dayLabel, dayGames]) => (
            <div key={dayLabel}>
              <p className="text-xs font-semibold text-gray-600 uppercase tracking-widest pt-3 pb-1">
                {dayLabel}
              </p>
              {dayGames.map((game: any) => {
                const pick = pickMap[game.id]
                const pickedSide = pick?.picked_team as 'home' | 'away' | undefined
                const pickedTeam = pickedSide === 'home' ? game.home_team : pickedSide === 'away' ? game.away_team : null
                const result: string | null = pick?.result ?? null
                const awayFav = game.spread_favorite === 'away'
                const homeFav = game.spread_favorite === 'home'
                const isFinal = game.result_confirmed === true

                return (
                  <div key={game.id} className="py-2.5 flex items-center gap-3">
                    {/* Matchup */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <MatchupChip
                          team={game.away_team}
                          spreadLabel={spreadLabel(game.spread, awayFav)}
                          isFav={awayFav}
                          lineSet={game.spread > 0}
                          isFinal={isFinal}
                          won={game.result === 'away_win'}
                        />
                        <span className="text-gray-700 text-xs">@</span>
                        <MatchupChip
                          team={game.home_team}
                          spreadLabel={spreadLabel(game.spread, homeFav)}
                          isFav={homeFav}
                          lineSet={game.spread > 0}
                          isFinal={isFinal}
                          won={game.result === 'home_win'}
                        />
                      </div>
                      {!isFinal && (
                        <p className="text-xs text-gray-600 mt-0.5">{formatTime(game.kickoff_time)}</p>
                      )}
                    </div>

                    {/* Pick result */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {pickedTeam ? (
                        <>
                          <PickChip team={pickedTeam} result={result} />
                        </>
                      ) : (
                        <span className="text-xs text-gray-700">No pick</span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          ))}
        </div>
      )}

      {/* Score summary */}
      {totalPicks > 0 && (
        <div className="flex items-center justify-between bg-gray-900 border border-gray-800 rounded-xl px-4 py-3">
          <span className="text-sm text-gray-400">
            {totalPicks} pick{totalPicks !== 1 ? 's' : ''} submitted
          </span>
          {hasResults ? (
            <span className="text-sm font-bold text-white">
              {wins}/{totalPicks}
              {wins === totalPicks && totalPicks > 0 && (
                <span className="ml-1.5 text-green-400 text-xs">Perfect</span>
              )}
            </span>
          ) : (
            <span className="text-xs text-gray-600">Results pending</span>
          )}
        </div>
      )}

      {totalPicks === 0 && (games ?? []).length > 0 && (
        <div className="text-center py-4 text-sm text-gray-600">
          {player.name} hasn't submitted picks for Week {selectedWeekNumber}.
        </div>
      )}
    </div>
  )
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function MatchupChip({
  team,
  spreadLabel,
  isFav,
  lineSet,
  isFinal,
  won,
}: {
  team: string
  spreadLabel: string
  isFav: boolean
  lineSet: boolean
  isFinal: boolean
  won: boolean
}) {
  const t = getTeam(team)
  return (
    <div className="flex items-center gap-1">
      <span
        className="inline-block px-2 py-0.5 rounded-md text-xs font-bold w-10 text-center"
        style={{ backgroundColor: t.color, color: t.light ? '#111827' : '#ffffff' }}
      >
        {t.abbr}
      </span>
      <span className={`text-xs tabular-nums ${
        isFinal
          ? won ? 'text-green-400 font-semibold' : 'text-gray-600'
          : isFav && lineSet ? 'text-white' : 'text-gray-600'
      }`}>
        {spreadLabel}
      </span>
    </div>
  )
}

function PickChip({ team, result }: { team: string; result: string | null }) {
  const t = getTeam(team)

  if (result === 'win') {
    return (
      <div className="flex items-center gap-1.5">
        <span
          className="inline-block px-2 py-0.5 rounded-md text-xs font-bold w-10 text-center"
          style={{ backgroundColor: t.color, color: t.light ? '#111827' : '#ffffff' }}
        >
          {t.abbr}
        </span>
        <span className="text-green-400 text-xs font-bold">W</span>
      </div>
    )
  }

  if (result === 'loss') {
    return (
      <div className="flex items-center gap-1.5">
        <span className="inline-block px-2 py-0.5 rounded-md text-xs font-bold w-10 text-center bg-gray-800 text-gray-500">
          {t.abbr}
        </span>
        <span className="text-red-500 text-xs font-bold">L</span>
      </div>
    )
  }

  if (result === 'push') {
    return (
      <div className="flex items-center gap-1.5">
        <span
          className="inline-block px-2 py-0.5 rounded-md text-xs font-bold w-10 text-center"
          style={{ backgroundColor: t.color, color: t.light ? '#111827' : '#ffffff' }}
        >
          {t.abbr}
        </span>
        <span className="text-yellow-500 text-xs font-bold">P</span>
      </div>
    )
  }

  // Pending — show team color (pick made, no result yet)
  return (
    <span
      className="inline-block px-2 py-0.5 rounded-md text-xs font-bold w-10 text-center"
      style={{ backgroundColor: t.color, color: t.light ? '#111827' : '#ffffff' }}
    >
      {t.abbr}
    </span>
  )
}
