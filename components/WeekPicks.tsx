'use client'

import { useState, useTransition, useEffect } from 'react'
import Image from 'next/image'
import type { Week, Game, Pick } from '@/app/(app)/week/page'

type UserPicksMap = Record<string, Pick>
type LocalPicks = Record<string, 'home' | 'away'>

type Props = {
  week: Week
  games: Game[]
  userPicks: UserPicksMap
  userId: string | null
  pickCount: number
  canPick: boolean
}

// ── Team logos ────────────────────────────────────────────────────────────────

const NFL_LOGOS: Record<string, string> = {
  'Arizona Cardinals': 'ari',   'Atlanta Falcons': 'atl',
  'Baltimore Ravens': 'bal',    'Buffalo Bills': 'buf',
  'Carolina Panthers': 'car',   'Chicago Bears': 'chi',
  'Cincinnati Bengals': 'cin',  'Cleveland Browns': 'cle',
  'Dallas Cowboys': 'dal',      'Denver Broncos': 'den',
  'Detroit Lions': 'det',       'Green Bay Packers': 'gb',
  'Houston Texans': 'hou',      'Indianapolis Colts': 'ind',
  'Jacksonville Jaguars': 'jax','Kansas City Chiefs': 'kc',
  'Las Vegas Raiders': 'lv',    'Los Angeles Chargers': 'lac',
  'Los Angeles Rams': 'lar',    'Miami Dolphins': 'mia',
  'Minnesota Vikings': 'min',   'New England Patriots': 'ne',
  'New Orleans Saints': 'no',   'New York Giants': 'nyg',
  'New York Jets': 'nyj',       'Philadelphia Eagles': 'phi',
  'Pittsburgh Steelers': 'pit', 'San Francisco 49ers': 'sf',
  'Seattle Seahawks': 'sea',    'Tampa Bay Buccaneers': 'tb',
  'Tennessee Titans': 'ten',    'Washington Commanders': 'wsh',
}

function getLogoUrl(teamName: string): string | null {
  const abbr = NFL_LOGOS[teamName]
  if (!abbr) return null
  return `https://a.espncdn.com/i/teamlogos/nfl/500/${abbr}.png`
}

function formatTime(kickoffTime: string): string {
  return new Date(kickoffTime).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone: 'America/New_York',
  }).replace(':00', '') + ' ET'
}

function formatDay(kickoffTime: string): string {
  return new Date(kickoffTime).toLocaleDateString('en-US', {
    timeZone: 'America/New_York',
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  })
}

function spreadLabel(game: Game, side: 'home' | 'away'): string | null {
  if (!game.spread || game.spread === 0) return null
  const isFav = game.spread_favorite === side
  return isFav ? `-${game.spread}` : `+${game.spread}`
}

function resultIcon(result: string): string {
  if (result === 'win') return '✅'
  if (result === 'loss') return '❌'
  if (result === 'push') return '➖'
  return ''
}

// ── Grouping ──────────────────────────────────────────────────────────────────

type TimeGroup = { label: string; games: Game[] }
type DayGroup = { dayLabel: string; dayKey: string; timeGroups: TimeGroup[]; multipleSlots: boolean }

function groupGames(games: Game[]): DayGroup[] {
  const dayMap = new Map<string, Game[]>()
  for (const game of games) {
    const key = formatDay(game.kickoff_time)
    if (!dayMap.has(key)) dayMap.set(key, [])
    dayMap.get(key)!.push(game)
  }
  return Array.from(dayMap.entries()).map(([dayKey, dayGames]) => {
    const hourMap = new Map<number, Game[]>()
    for (const game of dayGames) {
      const h = Number(new Date(game.kickoff_time).toLocaleString('en-US', {
        timeZone: 'America/New_York', hour: 'numeric', hour12: false,
      }))
      if (!hourMap.has(h)) hourMap.set(h, [])
      hourMap.get(h)!.push(game)
    }
    const timeGroups: TimeGroup[] = Array.from(hourMap.entries())
      .sort(([a], [b]) => a - b)
      .map(([, slotGames]) => ({ label: formatTime(slotGames[0].kickoff_time), games: slotGames }))
    return { dayLabel: dayKey, dayKey, timeGroups, multipleSlots: timeGroups.length > 1 }
  })
}

// ── GameCard (picking phase) ──────────────────────────────────────────────────

function TeamSide({
  team, side, isFav, spread, picked, canPick, onPick, gameId,
}: {
  team: string
  side: 'home' | 'away'
  isFav: boolean
  spread: string | null
  picked: boolean
  canPick: boolean
  onPick: (gameId: string, side: 'home' | 'away') => void
  gameId: string
}) {
  const logoUrl = getLogoUrl(team)
  let bg = ''
  if (picked) bg = 'bg-blue-900/50'

  return (
    <button
      onClick={() => canPick && onPick(gameId, side)}
      disabled={!canPick}
      className={`flex-1 flex flex-col items-center gap-1.5 py-4 px-2 transition-colors ${bg} ${!canPick ? 'cursor-default' : 'active:opacity-70'}`}
    >
      {logoUrl ? (
        <Image src={logoUrl} alt={team} width={44} height={44} unoptimized className="object-contain" />
      ) : (
        <div className="w-11 h-11 rounded-full bg-gray-800 flex items-center justify-center text-xs text-gray-500">
          {team.slice(0, 3).toUpperCase()}
        </div>
      )}
      <div className="text-sm font-semibold text-white text-center leading-tight px-1">{team}</div>
      {spread ? (
        <div className={`text-xs font-medium ${picked ? 'text-blue-300' : 'text-gray-400'}`}>{spread}</div>
      ) : (
        <div className="text-xs text-gray-700">—</div>
      )}
      <div className="text-xs text-gray-600">{side === 'away' ? 'Away' : 'Home'}</div>
    </button>
  )
}

function GameCard({
  game, localPick, onPick, canPick,
}: {
  game: Game
  localPick: 'home' | 'away' | undefined
  onPick: (gameId: string, side: 'home' | 'away') => void
  canPick: boolean
}) {
  const awaySpread = spreadLabel(game, 'away')
  const homeSpread = spreadLabel(game, 'home')

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
      <div className="px-4 pt-2.5 pb-1 text-xs text-gray-600 font-medium">
        {formatTime(game.kickoff_time)}
      </div>
      <div className="flex divide-x divide-gray-800">
        <TeamSide
          team={game.away_team} side="away"
          isFav={game.spread_favorite === 'away'}
          spread={awaySpread}
          picked={localPick === 'away'}
          canPick={canPick}
          onPick={onPick}
          gameId={game.id}
        />
        <TeamSide
          team={game.home_team} side="home"
          isFav={game.spread_favorite === 'home'}
          spread={homeSpread}
          picked={localPick === 'home'}
          canPick={canPick}
          onPick={onPick}
          gameId={game.id}
        />
      </div>
    </div>
  )
}

// ── SubmittedGameCard (post-submit) ───────────────────────────────────────────

function SubmittedGameCard({ game, pick }: { game: Game; pick: Pick }) {
  const pickedSide = pick.picked_team
  const pickedTeam = pickedSide === 'home' ? game.home_team : game.away_team
  const otherTeam = pickedSide === 'home' ? game.away_team : game.home_team
  const pickedLogo = getLogoUrl(pickedTeam)
  const sp = spreadLabel(game, pickedSide)
  const hasResult = pick.result && pick.result !== 'pending'

  let bg = 'bg-gray-900'
  let border = 'border-gray-800'
  if (hasResult) {
    if (pick.result === 'win') { bg = 'bg-green-900/20'; border = 'border-green-800/40' }
    else if (pick.result === 'loss') { bg = 'bg-red-900/20'; border = 'border-red-800/40' }
    else if (pick.result === 'push') { bg = 'bg-gray-800/40'; border = 'border-gray-700' }
  }

  return (
    <div className={`${bg} border ${border} rounded-xl p-4 flex items-center gap-3`}>
      {pickedLogo ? (
        <Image src={pickedLogo} alt={pickedTeam} width={40} height={40} unoptimized className="object-contain flex-shrink-0" />
      ) : (
        <div className="w-10 h-10 rounded-full bg-gray-800 flex-shrink-0" />
      )}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-semibold text-white">{pickedTeam}</span>
          {sp && <span className="text-xs text-gray-400">{sp}</span>}
          {hasResult && <span>{resultIcon(pick.result)}</span>}
        </div>
        <div className="text-xs text-gray-500 mt-0.5">
          vs {otherTeam} · {formatTime(game.kickoff_time)}
        </div>
        {!hasResult && <div className="text-xs text-gray-700 mt-0.5">Pending result</div>}
      </div>
    </div>
  )
}

// ── WeekPicks ─────────────────────────────────────────────────────────────────

export default function WeekPicks({ week, games, userPicks, userId, pickCount, canPick }: Props) {
  const [, startTransition] = useTransition()
  const [submitting, setSubmitting] = useState(false)

  const initialSubmitted = Object.keys(userPicks).length > 0
  const [submitted, setSubmitted] = useState(initialSubmitted)
  const [savedPicks, setSavedPicks] = useState<UserPicksMap>(userPicks)

  // Local picks buffer — starts from existing server picks if any
  const [localPicks, setLocalPicks] = useState<LocalPicks>(() => {
    const lp: LocalPicks = {}
    for (const [gid, pick] of Object.entries(userPicks)) {
      lp[gid] = pick.picked_team
    }
    return lp
  })

  // Sync server results into local savedPicks when game results come in
  useEffect(() => {
    setSavedPicks((prev) => {
      const merged = { ...prev }
      let changed = false
      for (const [gid, pick] of Object.entries(userPicks)) {
        if (merged[gid] && merged[gid].result !== pick.result) {
          merged[gid] = pick
          changed = true
        }
      }
      return changed ? merged : prev
    })
  }, [userPicks])

  const dayGroups = groupGames(games)
  const madeCount = Object.keys(localPicks).length
  const readyToSubmit = madeCount >= pickCount
  const noGamesYet = games.length === 0

  function handlePick(gameId: string, side: 'home' | 'away') {
    if (submitted || !canPick) return
    setLocalPicks((prev) => {
      const next = { ...prev }
      if (next[gameId] === side) delete next[gameId]
      else next[gameId] = side
      return next
    })
  }

  async function handleSubmit() {
    if (!userId || submitting) return
    setSubmitting(true)

    const entries = Object.entries(localPicks)
    try {
      const results = await Promise.all(
        entries.map(([gameId, pickedTeam]) =>
          fetch('/api/picks/upsert', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ gameId, pickedTeam }),
          }).then((r) => r.json())
        )
      )

      const newSaved: UserPicksMap = {}
      for (let i = 0; i < entries.length; i++) {
        const [gameId] = entries[i]
        const savedPick = results[i]?.pick
        if (savedPick) newSaved[gameId] = savedPick
      }

      startTransition(() => {
        setSavedPicks(newSaved)
        setSubmitted(true)
      })
    } finally {
      setSubmitting(false)
    }
  }

  // Determine pre-open state: games visible but no picks yet
  const isPreview = !canPick && week.status === 'pending'
  const isPostResults = !canPick && (week.status === 'sunday_complete' || week.status === 'results_posted' || week.status === 'tiebreaker')

  // Header right content
  let headerRight: React.ReactNode
  if (!canPick) {
    if (isPreview) {
      headerRight = <span className="text-xs text-gray-500 bg-gray-800 px-2.5 py-1 rounded-full">Lines dropping soon</span>
    } else if (isPostResults) {
      headerRight = <span className="text-xs text-green-400 bg-green-400/10 px-2.5 py-1 rounded-full">Results in</span>
    } else {
      headerRight = <span className="text-xs text-yellow-600 bg-yellow-600/10 px-2.5 py-1 rounded-full">Picks locked</span>
    }
  } else if (submitted) {
    headerRight = <span className="text-xs text-green-400 font-semibold">Submitted ✓</span>
  } else {
    headerRight = (
      <span className="bg-gray-800 text-gray-300 text-xs font-medium px-3 py-1 rounded-full">
        {madeCount} / {pickCount} picks
      </span>
    )
  }

  return (
    <div>
      {/* Pick status bar — sticks below the layout week bar */}
      <div className="sticky top-[41px] z-10 bg-gray-950 border-b border-gray-800 px-4 py-2 flex items-center justify-end">
        {headerRight}
      </div>

      <div className="p-4 space-y-4 pb-32">
        {/* Preview banner */}
        {isPreview && (
          <p className="text-xs text-gray-600 text-center py-2">
            Week {week.week_number} matchups — lines drop when the commissioner opens picks.
          </p>
        )}
        {isPostResults && (
          <p className="text-xs text-gray-600 text-center py-2">
            Week {week.week_number} is wrapped. Check the feed for results.
          </p>
        )}

        {/* No games yet */}
        {noGamesYet && (
          <p className="text-xs text-gray-600 text-center py-8">
            Week {week.week_number} slate coming soon.
          </p>
        )}

        {/* Post-submit: only show picked games */}
        {!noGamesYet && submitted && canPick ? (
          <div className="space-y-3">
            <p className="text-xs text-gray-500 uppercase tracking-widest font-semibold">Your picks</p>
            {Object.entries(savedPicks).map(([gameId, pick]) => {
              const game = games.find((g) => g.id === gameId)
              if (!game) return null
              return <SubmittedGameCard key={gameId} game={game} pick={pick} />
            })}
          </div>
        ) : !noGamesYet ? (
          /* All games (picking or preview) */
          dayGroups.map((dayGroup) => (
            <div key={dayGroup.dayKey}>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest pb-2">
                {dayGroup.dayLabel}
              </p>
              <div className="space-y-3">
                {dayGroup.timeGroups.map((timeGroup) => (
                  <div key={timeGroup.label} className="space-y-3">
                    {dayGroup.multipleSlots && (
                      <p className="text-xs text-gray-600 pl-1">
                        {timeGroup.label} · {timeGroup.games.length} game{timeGroup.games.length !== 1 ? 's' : ''}
                      </p>
                    )}
                    {timeGroup.games.map((game) => (
                      <GameCard
                        key={game.id}
                        game={game}
                        localPick={localPicks[game.id]}
                        onPick={handlePick}
                        canPick={canPick && !submitted}
                      />
                    ))}
                  </div>
                ))}
              </div>
            </div>
          ))
        ) : null}
      </div>

      {/* Sticky submit bar */}
      {canPick && !submitted && (
        <div className="fixed bottom-20 left-0 right-0 max-w-lg mx-auto px-4 pb-2">
          <button
            onClick={handleSubmit}
            disabled={!readyToSubmit || submitting}
            className="w-full py-3.5 rounded-xl bg-blue-600 active:bg-blue-700 text-white text-sm font-semibold disabled:opacity-40 transition-all shadow-xl"
          >
            {submitting
              ? 'Submitting…'
              : readyToSubmit
              ? `Lock in ${pickCount} picks →`
              : `Select ${pickCount - madeCount} more pick${pickCount - madeCount !== 1 ? 's' : ''}`}
          </button>
        </div>
      )}
    </div>
  )
}
