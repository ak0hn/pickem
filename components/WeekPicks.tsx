'use client'

import { useState, useTransition, useEffect } from 'react'
import Image from 'next/image'
import { getLogoUrl } from '@/lib/nfl-logos'
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

// ── GameCard ──────────────────────────────────────────────────────────────────

function TeamSide({
  team, side, spread, picked, isLocked, canPick, onPick, gameId,
}: {
  team: string
  side: 'home' | 'away'
  spread: string | null
  picked: boolean
  isLocked: boolean
  canPick: boolean
  onPick: (gameId: string, side: 'home' | 'away') => void
  gameId: string
}) {
  const logoUrl = getLogoUrl(team)
  const bg = picked ? 'bg-blue-900/50' : ''

  return (
    <button
      onClick={() => canPick && onPick(gameId, side)}
      disabled={!canPick}
      className={`flex-1 flex flex-col items-center gap-1 py-2.5 px-2 transition-colors ${bg} ${!canPick ? 'cursor-default' : 'active:opacity-70'}`}
    >
      {logoUrl ? (
        <Image src={logoUrl} alt={team} width={38} height={38} unoptimized className="object-contain" />
      ) : (
        <div className="w-9 h-9 rounded-full bg-gray-800 flex items-center justify-center text-xs text-gray-500">
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
  game, localPick, isLocked, onPick, canPick,
}: {
  game: Game
  localPick: 'home' | 'away' | undefined
  isLocked: boolean
  onPick: (gameId: string, side: 'home' | 'away') => void
  canPick: boolean
}) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
      <div className="px-4 pt-2.5 pb-1 text-xs text-gray-600 font-medium flex items-center gap-1.5">
        {formatTime(game.kickoff_time)}
        {isLocked && <span className="text-gray-700">· 🔒</span>}
      </div>
      <div className="flex divide-x divide-gray-800">
        <TeamSide
          team={game.away_team} side="away"
          spread={spreadLabel(game, 'away')}
          picked={localPick === 'away'}
          isLocked={isLocked}
          canPick={canPick}
          onPick={onPick}
          gameId={game.id}
        />
        <TeamSide
          team={game.home_team} side="home"
          spread={spreadLabel(game, 'home')}
          picked={localPick === 'home'}
          isLocked={isLocked}
          canPick={canPick}
          onPick={onPick}
          gameId={game.id}
        />
      </div>
    </div>
  )
}

// ── WeekPicks ─────────────────────────────────────────────────────────────────

export default function WeekPicks({ week, games, userPicks, userId, pickCount, canPick }: Props) {
  const [, startTransition] = useTransition()
  const [submitting, setSubmitting] = useState(false)
  const [slipOpen, setSlipOpen] = useState(false)

  const [savedPicks, setSavedPicks] = useState<UserPicksMap>(userPicks)

  // submittedGames tracks which game IDs are locked on the server
  const [submittedGames, setSubmittedGames] = useState<Set<string>>(
    () => new Set(Object.keys(userPicks))
  )

  const [localPicks, setLocalPicks] = useState<LocalPicks>(() => {
    const lp: LocalPicks = {}
    for (const [gid, pick] of Object.entries(userPicks)) {
      lp[gid] = pick.picked_team
    }
    return lp
  })

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
  const noGamesYet = games.length === 0

  const lockedCount = submittedGames.size
  const allLocked = lockedCount === pickCount

  // draft = selected but not yet submitted
  const draftGameIds = games
    .filter(g => localPicks[g.id] !== undefined && !submittedGames.has(g.id))
    .map(g => g.id)
  const draftCount = draftGameIds.length

  const [collapsedDays, setCollapsedDays] = useState<Set<string>>(new Set())
  const [collapsedSlots, setCollapsedSlots] = useState<Set<string>>(new Set())

  function toggleDay(key: string) {
    setCollapsedDays(prev => {
      const next = new Set(prev)
      next.has(key) ? next.delete(key) : next.add(key)
      return next
    })
  }
  function toggleSlot(key: string) {
    setCollapsedSlots(prev => {
      const next = new Set(prev)
      next.has(key) ? next.delete(key) : next.add(key)
      return next
    })
  }

  function handlePick(gameId: string, side: 'home' | 'away') {
    if (submittedGames.has(gameId) || !canPick) return
    setLocalPicks((prev) => {
      const next = { ...prev }
      if (next[gameId] === side) delete next[gameId]
      else next[gameId] = side
      return next
    })
  }

  function handleRemovePick(gameId: string) {
    if (submittedGames.has(gameId)) return
    setLocalPicks(prev => {
      const next = { ...prev }
      delete next[gameId]
      return next
    })
  }

  async function handleSubmit() {
    if (!userId || submitting || draftGameIds.length === 0) return
    setSubmitting(true)
    try {
      const results = await Promise.allSettled(
        draftGameIds.map((gameId) =>
          fetch('/api/picks/upsert', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ gameId, pickedTeam: localPicks[gameId] }),
          }).then((r) => r.json())
        )
      )
      startTransition(() => {
        setSavedPicks(prev => {
          const next = { ...prev }
          results.forEach((result, i) => {
            if (result.status === 'fulfilled' && result.value?.pick) {
              next[draftGameIds[i]] = result.value.pick
            }
          })
          return next
        })
        setSubmittedGames(prev => {
          const next = new Set(prev)
          results.forEach((result, i) => {
            if (result.status === 'fulfilled' && result.value?.pick) {
              next.add(draftGameIds[i])
            }
          })
          return next
        })
      })
    } finally {
      setSubmitting(false)
    }
  }

  const isPreview = !canPick && week.status === 'pending'
  const isPostResults = !canPick && (week.status === 'sunday_complete' || week.status === 'results_posted' || week.status === 'tiebreaker')

  const neededCount = pickCount - lockedCount - draftCount

  // Header badge
  let headerRight: React.ReactNode
  if (!canPick) {
    if (isPreview) {
      headerRight = <span className="text-xs text-gray-500 bg-gray-800 px-2.5 py-1 rounded-full">Lines dropping soon</span>
    } else if (isPostResults) {
      headerRight = <span className="text-xs text-green-400 bg-green-400/10 px-2.5 py-1 rounded-full">Results in</span>
    } else {
      headerRight = <span className="text-xs text-yellow-600 bg-yellow-600/10 px-2.5 py-1 rounded-full">Picks locked</span>
    }
  } else if (allLocked) {
    headerRight = (
      <span className="text-xs text-green-400 bg-green-400/10 font-semibold px-2.5 py-1 rounded-full">
        {pickCount} / {pickCount} locked ✓
      </span>
    )
  } else {
    headerRight = (
      <span className="bg-gray-800 text-xs font-medium px-3 py-1 rounded-full">
        <span className="text-green-500">{lockedCount} locked</span>
        {draftCount > 0 && <span className="text-blue-400"> · {draftCount} draft</span>}
        {neededCount > 0 && <span className="text-gray-500"> · {neededCount} needed</span>}
      </span>
    )
  }

  // Slip bar entries: all games in kickoff order that have a local pick
  const slipEntries = games
    .filter(g => localPicks[g.id] !== undefined)
    .map(g => ({ game: g, side: localPicks[g.id] }))

  // Slip bar label
  const barLabel = allLocked
    ? 'All picks locked ✓'
    : [
        lockedCount > 0 && `${lockedCount} locked`,
        draftCount > 0 && `${draftCount} draft`,
        neededCount > 0 && `${neededCount} needed`,
      ].filter(Boolean).join(' · ') || 'Select your picks'

  return (
    <div>
      {/* Sticky sub-header */}
      <div className="sticky top-[82px] z-10 bg-gray-950 border-b border-gray-800 px-4 py-2 flex items-center justify-end">
        {headerRight}
      </div>

      <div className="p-4 space-y-4 pb-36">
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
        {noGamesYet && (
          <p className="text-xs text-gray-600 text-center py-8">
            Week {week.week_number} slate coming soon.
          </p>
        )}

        {!noGamesYet && dayGroups.map((dayGroup) => {
          const dayCollapsed = collapsedDays.has(dayGroup.dayKey)
          return (
            <div key={dayGroup.dayKey}>
              <button
                onClick={() => toggleDay(dayGroup.dayKey)}
                className="w-full flex items-center justify-between pb-2 active:opacity-70"
              >
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest">
                  {dayGroup.dayLabel}
                </p>
                <span className="text-gray-600 text-xs">{dayCollapsed ? '▸' : '▾'}</span>
              </button>
              {!dayCollapsed && (
                <div className="space-y-3">
                  {dayGroup.timeGroups.map((timeGroup) => {
                    const slotKey = `${dayGroup.dayKey}-${timeGroup.label}`
                    const slotCollapsed = collapsedSlots.has(slotKey)
                    return (
                      <div key={timeGroup.label} className="space-y-2">
                        {dayGroup.multipleSlots && (
                          <button
                            onClick={() => toggleSlot(slotKey)}
                            className="w-full flex items-center justify-between pl-1 active:opacity-70"
                          >
                            <p className="text-xs text-gray-600">
                              {timeGroup.label} · {timeGroup.games.length} game{timeGroup.games.length !== 1 ? 's' : ''}
                            </p>
                            <span className="text-gray-700 text-xs">{slotCollapsed ? '▸' : '▾'}</span>
                          </button>
                        )}
                        {!slotCollapsed && timeGroup.games.map((game) => (
                          <GameCard
                            key={game.id}
                            game={game}
                            localPick={localPicks[game.id]}
                            isLocked={submittedGames.has(game.id)}
                            onPick={handlePick}
                            canPick={canPick && !submittedGames.has(game.id)}
                          />
                        ))}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* ── Bet slip ── */}
      {canPick && (
        <>
          {/* Backdrop */}
          {slipOpen && (
            <div
              className="fixed inset-0 z-30 bg-black/60"
              onClick={() => setSlipOpen(false)}
            />
          )}

          {/* Bottom sheet */}
          {slipOpen && (
            <div className="fixed bottom-16 left-0 right-0 max-w-lg mx-auto z-40 bg-gray-950 border border-gray-800 rounded-t-2xl">
              {/* Drag handle */}
              <div className="flex justify-center pt-3 pb-2">
                <div className="w-10 h-1 bg-gray-700 rounded-full" />
              </div>

              <div className="flex items-center justify-between px-4 pb-3">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest">Pick slip</p>
                {draftCount > 0 && (
                  <span className="text-xs text-blue-400 font-medium">{draftCount} not locked yet</span>
                )}
                {allLocked && (
                  <span className="text-xs text-green-400 font-semibold">All locked ✓</span>
                )}
              </div>

              {/* Pick rows — in kickoff order */}
              <div className="px-4 space-y-2 max-h-[50vh] overflow-y-auto">
                {Array.from({ length: pickCount }, (_, i) => {
                  const entry = slipEntries[i]
                  if (!entry) {
                    return (
                      <div key={i} className="h-14 rounded-xl bg-gray-900 border border-dashed border-gray-800 flex items-center px-4">
                        <span className="text-xs text-gray-700">Pick {i + 1} — select a team above</span>
                      </div>
                    )
                  }
                  const { game, side } = entry
                  const isLocked = submittedGames.has(game.id)
                  const team = side === 'home' ? game.home_team : game.away_team
                  const opponent = side === 'home' ? game.away_team : game.home_team
                  const logo = getLogoUrl(team)
                  const sp = spreadLabel(game, side)
                  const savedPick = savedPicks[game.id]
                  const hasResult = savedPick?.result && savedPick.result !== 'pending'

                  return (
                    <div
                      key={game.id}
                      className="flex items-center gap-3 rounded-xl px-3 py-2.5 border bg-gray-900 border-gray-800"
                    >
                      {logo ? (
                        <Image src={logo} alt={team} width={32} height={32} unoptimized className="object-contain flex-shrink-0" />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-gray-800 flex-shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm font-semibold text-white truncate">{team}</span>
                          {sp && <span className="text-xs text-gray-400 flex-shrink-0">{sp}</span>}
                          {hasResult && <span className="flex-shrink-0">{resultIcon(savedPick.result)}</span>}
                        </div>
                        <div className="text-xs text-gray-500 truncate">vs {opponent} · {formatTime(game.kickoff_time)}</div>
                      </div>
                      {/* Lock status / remove */}
                      {isLocked ? (
                        <span className="text-base flex-shrink-0">🔒</span>
                      ) : (
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <span className="text-xs text-gray-500 font-medium">Draft</span>
                          <button
                            onClick={() => handleRemovePick(game.id)}
                            className="text-gray-600 active:text-red-400 text-base leading-none px-1"
                          >
                            ✕
                          </button>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>

              {/* Submit */}
              <div className="px-4 py-4">
                {allLocked ? (
                  <div className="text-center py-1">
                    <span className="text-sm text-green-400 font-semibold">All {pickCount} picks locked in ✓</span>
                  </div>
                ) : draftCount > 0 ? (
                  <button
                    onClick={handleSubmit}
                    disabled={submitting}
                    className="w-full py-3.5 rounded-xl bg-blue-600 active:bg-blue-700 text-white text-sm font-semibold disabled:opacity-40 transition-all"
                  >
                    {submitting ? 'Locking in…' : `Lock in ${draftCount} pick${draftCount !== 1 ? 's' : ''} →`}
                  </button>
                ) : (
                  <p className="text-center text-xs text-gray-600 py-1">Select picks above to lock them in</p>
                )}
              </div>
            </div>
          )}

          {/* Slip bar */}
          {!slipOpen && (
            <div className="fixed bottom-16 left-0 right-0 max-w-lg mx-auto z-20 flex border-t border-gray-800 bg-gray-950">
              {/* Left zone: logos + label — opens slip */}
              <button
                onClick={() => setSlipOpen(true)}
                className="flex-1 flex items-center gap-3 px-4 py-3 min-w-0"
              >
                <div className="flex gap-1.5 flex-shrink-0">
                  {Array.from({ length: pickCount }, (_, i) => {
                    const entry = slipEntries[i]
                    const team = entry ? (entry.side === 'home' ? entry.game.home_team : entry.game.away_team) : null
                    const logo = team ? getLogoUrl(team) : null
                    const sp = entry ? spreadLabel(entry.game, entry.side) : null
                    return (
                      <div key={i} className="flex flex-col items-center gap-0.5">
                        {logo ? (
                          <Image
                            src={logo} alt={team!} width={28} height={28} unoptimized
                            className="rounded-full object-contain bg-white flex-shrink-0 border border-gray-600"
                          />
                        ) : (
                          <div className="w-7 h-7 rounded-full bg-gray-800 border border-gray-700 flex-shrink-0" />
                        )}
                        <span className="text-[9px] leading-none text-gray-500 font-medium">
                          {sp ?? ''}
                        </span>
                      </div>
                    )
                  })}
                </div>
                <span className={`text-sm font-medium truncate ml-1 ${
                  allLocked ? 'text-green-400' : draftCount > 0 ? 'text-blue-400' : 'text-gray-500'
                }`}>
                  {barLabel}
                </span>
              </button>

              {/* Right zone: lock button (when drafts exist) or chevron */}
              {draftCount > 0 ? (
                <button
                  onClick={handleSubmit}
                  disabled={submitting}
                  className="px-4 bg-blue-600 active:bg-blue-700 text-white text-sm font-semibold disabled:opacity-40 flex-shrink-0"
                >
                  {submitting ? '…' : `Lock ${draftCount} →`}
                </button>
              ) : (
                <button
                  onClick={() => setSlipOpen(true)}
                  className="px-4 text-gray-500 text-xs flex-shrink-0"
                >
                  ▲
                </button>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}
