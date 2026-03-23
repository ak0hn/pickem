'use client'

import { useState, useTransition } from 'react'
import type { Week, Game, Pick } from '@/app/(app)/week/page'

type UserPicksMap = Record<string, Pick>

type Props = {
  week: Week
  games: Game[]
  userPicks: UserPicksMap
  userId: string | null
  pickCount: number
}

function formatKickoffTime(kickoffTime: string): string {
  const date = new Date(kickoffTime)
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  const day = dayNames[date.getDay()]
  // Format time in ET
  const timeStr = date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone: 'America/New_York',
  })
  return `${day} ${timeStr} ET`
}

function getSpreadLabel(game: Game, side: 'home' | 'away'): string {
  const teamName = side === 'home' ? game.home_team : game.away_team
  const isFavored =
    game.spread_favorite === side ||
    game.spread_favorite === teamName

  if (isFavored && game.spread != null && game.spread !== 0) {
    return `${teamName} -${Math.abs(game.spread)}`
  }
  return teamName
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

  // Only show a status once results have started coming in
  if (picksWithResults.length === 0) {
    return { show: false, label: '', color: '' }
  }

  const wins = picksWithResults.filter((p) => p.result === 'win').length
  const losses = picksWithResults.filter((p) => p.result === 'loss').length
  const totalResolved = picksWithResults.length

  if (losses > 0) {
    return { show: true, label: 'Eliminated', color: 'text-red-400' }
  }

  if (totalResolved === pickCount && wins === pickCount) {
    return { show: true, label: 'Perfect week!', color: 'text-yellow-400' }
  }

  return { show: true, label: 'Still alive', color: 'text-green-400' }
}

type GameCardProps = {
  game: Game
  pick: Pick | undefined
  onPick: (gameId: string, side: 'home' | 'away') => void
  pendingSide: 'home' | 'away' | null
}

function GameCard({ game, pick, onPick, pendingSide }: GameCardProps) {
  const now = new Date()
  const kickoff = new Date(game.kickoff_time)
  const isLocked = kickoff <= now
  const hasResult = pick && pick.result && pick.result !== 'pending'

  const pickedSide = pick?.picked_team ?? null

  function buttonClass(side: 'home' | 'away'): string {
    const base =
      'flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all duration-150 relative'

    if (isLocked) {
      // No buttons when locked
      return base + ' hidden'
    }

    if (pendingSide === side) {
      return base + ' bg-blue-600 text-white opacity-70 cursor-not-allowed'
    }

    if (pickedSide === null) {
      // Unpicked — both equally styled
      return base + ' bg-gray-700 hover:bg-gray-600 text-white'
    }

    if (pickedSide === side) {
      // This side is picked — highlighted
      return base + ' bg-blue-600 text-white'
    }

    // Other side — dimmed
    return base + ' bg-gray-800 text-gray-500 hover:bg-gray-700'
  }

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 space-y-3">
      {/* Kickoff time row */}
      <div className="text-xs text-gray-500 font-medium">
        {formatKickoffTime(game.kickoff_time)}
        {isLocked && (
          <span className="ml-2 text-gray-600">🔒 Locked</span>
        )}
      </div>

      {/* Teams row */}
      <div className="flex items-center gap-2">
        <div className="flex-1 text-center">
          <div className="text-sm font-semibold text-white">
            {getSpreadLabel(game, 'away')}
          </div>
          <div className="text-xs text-gray-500">Away</div>
        </div>

        <div className="text-gray-600 font-bold text-sm">vs</div>

        <div className="flex-1 text-center">
          <div className="text-sm font-semibold text-white">
            {getSpreadLabel(game, 'home')}
          </div>
          <div className="text-xs text-gray-500">Home</div>
        </div>
      </div>

      {/* Locked state — show pick or nothing */}
      {isLocked ? (
        <div className="text-center text-sm text-gray-500">
          {pickedSide ? (
            <span>
              Picked:{' '}
              <span className="text-gray-300 font-medium">
                {pickedSide === 'away' ? game.away_team : game.home_team}
              </span>
              {hasResult && (
                <span className="ml-2">{getResultIcon(pick!.result)}</span>
              )}
            </span>
          ) : (
            <span className="text-gray-600">No pick submitted</span>
          )}
        </div>
      ) : (
        /* Pick buttons — only shown when unlocked */
        <div className="flex gap-2">
          <button
            className={buttonClass('away')}
            onClick={() => !pendingSide && onPick(game.id, 'away')}
            disabled={!!pendingSide}
            aria-pressed={pickedSide === 'away'}
          >
            {pendingSide === 'away' ? (
              <span className="inline-block w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin mr-1 align-middle" />
            ) : null}
            Pick Away
            {pickedSide === 'away' && hasResult && (
              <span className="ml-1">{getResultIcon(pick!.result)}</span>
            )}
          </button>

          <button
            className={buttonClass('home')}
            onClick={() => !pendingSide && onPick(game.id, 'home')}
            disabled={!!pendingSide}
            aria-pressed={pickedSide === 'home'}
          >
            {pendingSide === 'home' ? (
              <span className="inline-block w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin mr-1 align-middle" />
            ) : null}
            Pick Home
            {pickedSide === 'home' && hasResult && (
              <span className="ml-1">{getResultIcon(pick!.result)}</span>
            )}
          </button>
        </div>
      )}
    </div>
  )
}

export default function WeekPicks({
  week,
  games,
  userPicks,
  userId,
  pickCount,
}: Props) {
  const [picks, setPicks] = useState<UserPicksMap>(userPicks)
  // Map of game_id → side currently being submitted
  const [pending, setPending] = useState<Record<string, 'home' | 'away'>>({})
  const [, startTransition] = useTransition()

  const madePicksCount = Object.keys(picks).length
  const weekStatus = getWeekStatus(games, picks, pickCount)

  async function handlePick(gameId: string, side: 'home' | 'away') {
    if (!userId) return

    // Optimistic update
    const previousPick = picks[gameId]
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
        // Revert optimistic update
        startTransition(() => {
          setPicks((prev) => {
            const next = { ...prev }
            if (previousPick) {
              next[gameId] = previousPick
            } else {
              delete next[gameId]
            }
            return next
          })
        })
      } else {
        const { pick: savedPick } = await res.json()
        // Merge in the real pick id from the server
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
      // Revert
      startTransition(() => {
        setPicks((prev) => {
          const next = { ...prev }
          if (previousPick) {
            next[gameId] = previousPick
          } else {
            delete next[gameId]
          }
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
        <h1 className="text-2xl font-bold text-white">
          Week {week.week_number}
        </h1>
        <div className="flex flex-col items-end gap-1">
          <span className="bg-gray-800 text-gray-300 text-xs font-medium px-3 py-1 rounded-full">
            {madePicksCount} of {pickCount} picks made
          </span>
          {weekStatus.show && (
            <span className={`text-xs font-semibold ${weekStatus.color}`}>
              {weekStatus.label}
            </span>
          )}
        </div>
      </div>

      {/* Game cards */}
      {games.length === 0 ? (
        <div className="text-center text-gray-500 py-12">
          No games scheduled yet.
        </div>
      ) : (
        games.map((game) => (
          <GameCard
            key={game.id}
            game={game}
            pick={picks[game.id]}
            onPick={handlePick}
            pendingSide={pending[game.id] ?? null}
          />
        ))
      )}
    </div>
  )
}
