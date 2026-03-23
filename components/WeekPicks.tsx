'use client'

import { useState, useTransition } from 'react'
import Image from 'next/image'
import type { Week, Game, Pick } from '@/app/(app)/week/page'

type UserPicksMap = Record<string, Pick>

type Props = {
  week: Week
  games: Game[]
  userPicks: UserPicksMap
  userId: string | null
  pickCount: number
}

// Short names (as typically stored in DB) and full names → ESPN abbreviation
const NFL_LOGOS: Record<string, string> = {
  Cardinals: 'ari',        'Arizona Cardinals': 'ari',
  Falcons: 'atl',          'Atlanta Falcons': 'atl',
  Ravens: 'bal',           'Baltimore Ravens': 'bal',
  Bills: 'buf',            'Buffalo Bills': 'buf',
  Panthers: 'car',         'Carolina Panthers': 'car',
  Bears: 'chi',            'Chicago Bears': 'chi',
  Bengals: 'cin',          'Cincinnati Bengals': 'cin',
  Browns: 'cle',           'Cleveland Browns': 'cle',
  Cowboys: 'dal',          'Dallas Cowboys': 'dal',
  Broncos: 'den',          'Denver Broncos': 'den',
  Lions: 'det',            'Detroit Lions': 'det',
  Packers: 'gb',           'Green Bay Packers': 'gb',
  Texans: 'hou',           'Houston Texans': 'hou',
  Colts: 'ind',            'Indianapolis Colts': 'ind',
  Jaguars: 'jax',          'Jacksonville Jaguars': 'jax',
  Chiefs: 'kc',            'Kansas City Chiefs': 'kc',
  Raiders: 'lv',           'Las Vegas Raiders': 'lv',
  Chargers: 'lac',         'Los Angeles Chargers': 'lac',
  Rams: 'lar',             'Los Angeles Rams': 'lar',
  Dolphins: 'mia',         'Miami Dolphins': 'mia',
  Vikings: 'min',          'Minnesota Vikings': 'min',
  Patriots: 'ne',          'New England Patriots': 'ne',
  Saints: 'no',            'New Orleans Saints': 'no',
  Giants: 'nyg',           'New York Giants': 'nyg',
  Jets: 'nyj',             'New York Jets': 'nyj',
  Eagles: 'phi',           'Philadelphia Eagles': 'phi',
  Steelers: 'pit',         'Pittsburgh Steelers': 'pit',
  '49ers': 'sf',           'San Francisco 49ers': 'sf',
  Seahawks: 'sea',         'Seattle Seahawks': 'sea',
  Buccaneers: 'tb',        'Tampa Bay Buccaneers': 'tb',
  Titans: 'ten',           'Tennessee Titans': 'ten',
  Commanders: 'wsh',       'Washington Commanders': 'wsh',
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
  })
}

function getSpreadLabel(game: Game, side: 'home' | 'away'): string {
  const teamName = side === 'home' ? game.home_team : game.away_team
  const isFavored = game.spread_favorite === side || game.spread_favorite === teamName

  if (game.spread == null || game.spread === 0) return teamName
  if (isFavored) return `${teamName} -${Math.abs(game.spread)}`
  return `${teamName} +${Math.abs(game.spread)}`
}

function getResultIcon(result: string): string {
  if (result === 'win') return '✅'
  if (result === 'loss') return '❌'
  if (result === 'push') return '➖'
  return ''
}

function getWeekStatus(
  games: Game[],
  userPicks: UserPicksMap,
  pickCount: number
): { show: boolean; label: string; color: string } {
  const picksWithResults = Object.values(userPicks).filter(
    (p) => p.result && p.result !== 'pending'
  )
  if (picksWithResults.length === 0) return { show: false, label: '', color: '' }

  const wins = picksWithResults.filter((p) => p.result === 'win').length
  const losses = picksWithResults.filter((p) => p.result === 'loss').length
  const totalResolved = picksWithResults.length

  if (losses > 0) return { show: true, label: 'Eliminated', color: 'text-red-400' }
  if (totalResolved === pickCount && wins === pickCount)
    return { show: true, label: 'Perfect week!', color: 'text-yellow-400' }
  return { show: true, label: 'Still alive', color: 'text-green-400' }
}

// ── Grouping ──────────────────────────────────────────────────────────────────

type TimeGroup = { label: string; games: Game[] }
type DayGroup = {
  dayLabel: string
  dayKey: string
  timeGroups: TimeGroup[]
  multipleSlots: boolean
}

function groupGames(games: Game[]): DayGroup[] {
  const dayMap = new Map<string, Game[]>()

  for (const game of games) {
    const dayKey = new Date(game.kickoff_time).toLocaleDateString('en-US', {
      timeZone: 'America/New_York',
      weekday: 'long',
      month: 'short',
      day: 'numeric',
    })
    if (!dayMap.has(dayKey)) dayMap.set(dayKey, [])
    dayMap.get(dayKey)!.push(game)
  }

  return Array.from(dayMap.entries()).map(([dayKey, dayGames]) => {
    const hourMap = new Map<number, Game[]>()

    for (const game of dayGames) {
      // Extract ET hour as a number for bucketing
      const etHour = Number(
        new Date(game.kickoff_time).toLocaleString('en-US', {
          timeZone: 'America/New_York',
          hour: 'numeric',
          hour12: false,
        })
      )
      if (!hourMap.has(etHour)) hourMap.set(etHour, [])
      hourMap.get(etHour)!.push(game)
    }

    const timeGroups: TimeGroup[] = Array.from(hourMap.entries())
      .sort(([a], [b]) => a - b)
      .map(([, slotGames]) => ({
        label: `${formatTime(slotGames[0].kickoff_time)} ET`,
        games: slotGames,
      }))

    return { dayLabel: dayKey, dayKey, timeGroups, multipleSlots: timeGroups.length > 1 }
  })
}

// ── GameCard ──────────────────────────────────────────────────────────────────

type GameCardProps = {
  game: Game
  pick: Pick | undefined
  onPick: (gameId: string, side: 'home' | 'away') => void
  pendingSide: 'home' | 'away' | null
}

function GameCard({ game, pick, onPick, pendingSide }: GameCardProps) {
  const isLocked = new Date(game.kickoff_time) <= new Date()
  const hasResult = pick && pick.result && pick.result !== 'pending'
  const pickedSide = pick?.picked_team ?? null

  const awayLogoUrl = getLogoUrl(game.away_team)
  const homeLogoUrl = getLogoUrl(game.home_team)

  const lockTooltip = 'Game has already started — picks are locked'

  function buttonClass(side: 'home' | 'away'): string {
    const base = 'flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all duration-150'
    if (isLocked) {
      if (pickedSide === side) return base + ' bg-blue-950 text-blue-400 opacity-70 cursor-not-allowed'
      return base + ' bg-gray-800 text-gray-600 cursor-not-allowed'
    }
    if (pendingSide === side) return base + ' bg-blue-600 text-white opacity-70 cursor-not-allowed'
    if (pickedSide === null) return base + ' bg-gray-700 hover:bg-gray-600 text-white'
    if (pickedSide === side) return base + ' bg-blue-600 text-white'
    return base + ' bg-gray-800 text-gray-500 hover:bg-gray-700'
  }

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 space-y-3">
      {/* Kickoff time + lock indicator */}
      <div className="text-xs text-gray-600 font-medium">
        {formatTime(game.kickoff_time)} ET
        {isLocked && <span className="ml-2">🔒 Locked</span>}
      </div>

      {/* Teams row */}
      <div className="flex items-center gap-2">
        {/* Away */}
        <div className="flex-1 text-center">
          {awayLogoUrl && (
            <Image
              src={awayLogoUrl}
              alt={game.away_team}
              width={40}
              height={40}
              className="mx-auto mb-1"
              unoptimized
            />
          )}
          <div className="text-sm font-semibold text-white">{getSpreadLabel(game, 'away')}</div>
          <div className="text-xs text-gray-500">Away</div>
        </div>

        <div className="text-gray-600 font-bold text-sm">vs</div>

        {/* Home */}
        <div className="flex-1 text-center">
          {homeLogoUrl && (
            <Image
              src={homeLogoUrl}
              alt={game.home_team}
              width={40}
              height={40}
              className="mx-auto mb-1"
              unoptimized
            />
          )}
          <div className="text-sm font-semibold text-white">{getSpreadLabel(game, 'home')}</div>
          <div className="text-xs text-gray-500">Home</div>
        </div>
      </div>

      {/* Pick buttons — always shown; disabled with tooltip when locked */}
      <div className="flex gap-2">
        <button
          className={buttonClass('away')}
          onClick={() => !isLocked && !pendingSide && onPick(game.id, 'away')}
          disabled={isLocked || !!pendingSide}
          title={isLocked ? lockTooltip : undefined}
          aria-pressed={pickedSide === 'away'}
        >
          {pendingSide === 'away' && (
            <span className="inline-block w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin mr-1 align-middle" />
          )}
          Pick Away
          {pickedSide === 'away' && hasResult && (
            <span className="ml-1">{getResultIcon(pick!.result)}</span>
          )}
        </button>

        <button
          className={buttonClass('home')}
          onClick={() => !isLocked && !pendingSide && onPick(game.id, 'home')}
          disabled={isLocked || !!pendingSide}
          title={isLocked ? lockTooltip : undefined}
          aria-pressed={pickedSide === 'home'}
        >
          {pendingSide === 'home' && (
            <span className="inline-block w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin mr-1 align-middle" />
          )}
          Pick Home
          {pickedSide === 'home' && hasResult && (
            <span className="ml-1">{getResultIcon(pick!.result)}</span>
          )}
        </button>
      </div>
    </div>
  )
}

// ── WeekPicks ─────────────────────────────────────────────────────────────────

export default function WeekPicks({ week, games, userPicks, userId, pickCount }: Props) {
  const [picks, setPicks] = useState<UserPicksMap>(userPicks)
  const [pending, setPending] = useState<Record<string, 'home' | 'away'>>({})
  const [, startTransition] = useTransition()

  const dayGroups = groupGames(games)

  // All days open by default
  const [openDays, setOpenDays] = useState<Set<string>>(
    () => new Set(dayGroups.map((g) => g.dayKey))
  )

  // All time slots open by default — keyed by "dayKey|timeLabel"
  const [openSlots, setOpenSlots] = useState<Set<string>>(
    () =>
      new Set(
        dayGroups.flatMap((g) => g.timeGroups.map((t) => `${g.dayKey}|${t.label}`))
      )
  )

  function toggleSlot(dayKey: string, slotLabel: string) {
    const key = `${dayKey}|${slotLabel}`
    setOpenSlots((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  const madePicksCount = Object.keys(picks).length
  const weekStatus = getWeekStatus(games, picks, pickCount)

  function toggleDay(dayKey: string) {
    setOpenDays((prev) => {
      const next = new Set(prev)
      if (next.has(dayKey)) next.delete(dayKey)
      else next.add(dayKey)
      return next
    })
  }

  async function handlePick(gameId: string, side: 'home' | 'away') {
    if (!userId) return

    const previousPick = picks[gameId]

    // Tapping the already-selected side unselects it
    if (previousPick?.picked_team === side) {
      setPending((prev) => ({ ...prev, [gameId]: side }))
      startTransition(() => setPicks((prev) => { const next = { ...prev }; delete next[gameId]; return next }))

      try {
        const res = await fetch('/api/picks/delete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ gameId }),
        })
        if (!res.ok) {
          // Revert
          startTransition(() => setPicks((prev) => ({ ...prev, [gameId]: previousPick })))
        }
      } catch {
        startTransition(() => setPicks((prev) => ({ ...prev, [gameId]: previousPick })))
      } finally {
        setPending((prev) => { const next = { ...prev }; delete next[gameId]; return next })
      }
      return
    }

    // Selecting a new side
    const optimisticPick: Pick = {
      id: previousPick?.id ?? '',
      game_id: gameId,
      picked_team: side,
      result: previousPick?.result ?? 'pending',
      locked_at: previousPick?.locked_at ?? null,
    }

    setPending((prev) => ({ ...prev, [gameId]: side }))
    setPicks((prev) => ({ ...prev, [gameId]: optimisticPick }))

    try {
      const res = await fetch('/api/picks/upsert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gameId, pickedTeam: side }),
      })

      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        console.error('Pick upsert failed:', body)
        startTransition(() => {
          setPicks((prev) => {
            const next = { ...prev }
            if (previousPick) next[gameId] = previousPick
            else delete next[gameId]
            return next
          })
        })
      } else {
        const { pick: savedPick } = await res.json()
        startTransition(() => {
          setPicks((prev) => ({
            ...prev,
            [gameId]: {
              ...optimisticPick,
              id: savedPick?.id ?? optimisticPick.id,
              result: savedPick?.result ?? optimisticPick.result,
            },
          }))
        })
      }
    } catch (err) {
      console.error('Network error submitting pick:', err)
      startTransition(() => {
        setPicks((prev) => {
          const next = { ...prev }
          if (previousPick) next[gameId] = previousPick
          else delete next[gameId]
          return next
        })
      })
    } finally {
      setPending((prev) => {
        const next = { ...prev }
        delete next[gameId]
        return next
      })
    }
  }

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Week {week.week_number}</h1>
        <div className="flex flex-col items-end gap-1">
          <span className="bg-gray-800 text-gray-300 text-xs font-medium px-3 py-1 rounded-full">
            {madePicksCount} of {pickCount} picks made
          </span>
          {weekStatus.show && (
            <span className={`text-xs font-semibold ${weekStatus.color}`}>{weekStatus.label}</span>
          )}
        </div>
      </div>

      {/* Day accordions */}
      {dayGroups.length === 0 ? (
        <div className="text-center text-gray-500 py-12">No games scheduled yet.</div>
      ) : (
        dayGroups.map((dayGroup) => {
          const isOpen = openDays.has(dayGroup.dayKey)
          return (
            <div key={dayGroup.dayKey}>
              {/* Day header — tap to collapse */}
              <button
                onClick={() => toggleDay(dayGroup.dayKey)}
                className="w-full flex items-center justify-between py-2 text-left"
              >
                <span className="text-xs font-semibold text-gray-400 uppercase tracking-widest">
                  {dayGroup.dayLabel}
                </span>
                <span className="text-gray-600 text-xs">{isOpen ? '▲' : '▼'}</span>
              </button>

              {isOpen && (
                <div className="space-y-4">
                  {dayGroup.timeGroups.map((timeGroup) => {
                    const slotKey = `${dayGroup.dayKey}|${timeGroup.label}`
                    const slotOpen = openSlots.has(slotKey)
                    return (
                      <div key={timeGroup.label} className="space-y-3">
                        {/* Time slot sub-header — collapsible, only when day has multiple windows */}
                        {dayGroup.multipleSlots && (
                          <button
                            onClick={() => toggleSlot(dayGroup.dayKey, timeGroup.label)}
                            className="w-full flex items-center justify-between pl-1 py-1 text-left"
                          >
                            <span className="text-xs text-gray-500 font-medium">
                              {timeGroup.label}
                              <span className="ml-2 text-gray-700">
                                ({timeGroup.games.length} game{timeGroup.games.length !== 1 ? 's' : ''})
                              </span>
                            </span>
                            <span className="text-gray-700 text-xs">{slotOpen ? '▲' : '▼'}</span>
                          </button>
                        )}
                        {(!dayGroup.multipleSlots || slotOpen) &&
                          timeGroup.games.map((game) => (
                            <GameCard
                              key={game.id}
                              game={game}
                              pick={picks[game.id]}
                              onPick={handlePick}
                              pendingSide={pending[game.id] ?? null}
                            />
                          ))}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })
      )}
    </div>
  )
}
