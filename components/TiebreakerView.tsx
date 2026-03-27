'use client'

import { useState } from 'react'
import Image from 'next/image'

type TiebreakerGame = {
  id: string
  home_team: string
  away_team: string
  spread: number
  spread_favorite: string
  kickoff_time: string
  result: string
  result_confirmed: boolean
}

type ExistingPick = {
  picked_team: 'home' | 'away'
  result: string
} | null

type Props = {
  game: TiebreakerGame
  weekId: string
  userId: string | null
  isEligible: boolean
  existingPick: ExistingPick
  homeVotes: number
  awayVotes: number
  totalVotes: number
}

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
  return abbr ? `https://a.espncdn.com/i/teamlogos/nfl/500/${abbr}.png` : null
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('en-US', {
    weekday: 'short',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone: 'America/New_York',
  }).replace(':00', '') + ' ET'
}

function spreadLabel(spread: number, isFav: boolean) {
  if (spread === 0) return 'PK'
  return isFav ? `-${spread}` : `+${spread}`
}

function TeamLogo({ name, size = 40 }: { name: string; size?: number }) {
  const url = getLogoUrl(name)
  if (!url) return <div style={{ width: size, height: size }} className="bg-gray-800 rounded-full" />
  return (
    <Image
      src={url}
      alt={name}
      width={size}
      height={size}
      className="object-contain"
      unoptimized
    />
  )
}

export default function TiebreakerView({
  game,
  weekId,
  userId,
  isEligible,
  existingPick,
  homeVotes,
  awayVotes,
  totalVotes,
}: Props) {
  const [pick, setPick] = useState<'home' | 'away' | null>(existingPick?.picked_team ?? null)
  const [submitted, setSubmitted] = useState(!!existingPick)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isLocked = game.result_confirmed || new Date(game.kickoff_time) <= new Date()
  const awayFav = game.spread_favorite === 'away'
  const homeFav = game.spread_favorite === 'home'

  async function handlePick(side: 'home' | 'away') {
    if (!userId || submitted || isLocked || loading) return
    setPick(side)
    setLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/picks/upsert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gameId: game.id, pickedTeam: side }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed to save pick')
      setSubmitted(true)
    } catch (e: any) {
      setError(e.message)
      setPick(existingPick?.picked_team ?? null)
    } finally {
      setLoading(false)
    }
  }

  const pickResult = submitted && game.result_confirmed
    ? (pick === 'home' && game.result === 'home_win') || (pick === 'away' && game.result === 'away_win')
      ? 'win'
      : game.result === 'push'
      ? 'push'
      : 'loss'
    : null

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-yellow-400 bg-yellow-400/10 px-2 py-0.5 rounded-full">
            MNF Tiebreaker
          </span>
        </div>
        <span className="text-xs text-gray-500">{formatTime(game.kickoff_time)}</span>
      </div>

      {/* Eligible player pick UI */}
      {isEligible && (
        <div className="p-4 space-y-4">
          {submitted ? (
            // Submitted state
            <div className="space-y-3">
              <p className="text-xs text-gray-500 text-center">Your pick is locked in.</p>
              <div className="grid grid-cols-2 gap-3">
                {(['away', 'home'] as const).map((side) => {
                  const teamName = side === 'away' ? game.away_team : game.home_team
                  const isFav = side === 'away' ? awayFav : homeFav
                  const isMyPick = pick === side
                  const spread = spreadLabel(game.spread, isFav)

                  let resultStyle = ''
                  if (pickResult === 'win' && isMyPick) resultStyle = 'ring-2 ring-green-500'
                  else if (pickResult === 'loss' && isMyPick) resultStyle = 'ring-2 ring-red-500 opacity-60'
                  else if (pickResult === 'push' && isMyPick) resultStyle = 'ring-2 ring-gray-500'
                  else if (isMyPick) resultStyle = 'ring-2 ring-blue-500'
                  else resultStyle = 'opacity-40'

                  return (
                    <div
                      key={side}
                      className={`flex flex-col items-center gap-2 p-3 rounded-xl bg-gray-800 ${resultStyle}`}
                    >
                      <TeamLogo name={teamName} size={44} />
                      <div className="text-center">
                        <p className="text-xs font-semibold text-white">{teamName.split(' ').pop()}</p>
                        <p className="text-xs text-gray-500">{spread}</p>
                      </div>
                      {isMyPick && (
                        <span className="text-xs text-blue-400 font-medium">Your pick</span>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          ) : isLocked ? (
            <p className="text-sm text-gray-500 text-center py-2">
              Picks are locked — game has started.
            </p>
          ) : (
            // Pick selection
            <div className="space-y-3">
              <p className="text-xs text-gray-400 text-center">Tap to pick — locks at kickoff.</p>
              <div className="grid grid-cols-2 gap-3">
                {(['away', 'home'] as const).map((side) => {
                  const teamName = side === 'away' ? game.away_team : game.home_team
                  const isFav = side === 'away' ? awayFav : homeFav
                  const isSelected = pick === side

                  return (
                    <button
                      key={side}
                      onClick={() => handlePick(side)}
                      disabled={loading}
                      className={`flex flex-col items-center gap-2 p-3 rounded-xl transition-all active:scale-95 ${
                        isSelected
                          ? 'bg-blue-600 ring-2 ring-blue-400'
                          : 'bg-gray-800 active:bg-gray-700'
                      }`}
                    >
                      <TeamLogo name={teamName} size={44} />
                      <div className="text-center">
                        <p className="text-xs font-semibold text-white">{teamName.split(' ').pop()}</p>
                        <p className={`text-xs ${isSelected ? 'text-blue-200' : 'text-gray-500'}`}>
                          {spreadLabel(game.spread, isFav)}
                        </p>
                      </div>
                    </button>
                  )
                })}
              </div>
              {error && <p className="text-xs text-red-400 text-center">{error}</p>}
            </div>
          )}
        </div>
      )}

      {/* Non-eligible: vote tally */}
      {!isEligible && (
        <div className="p-4 space-y-4">
          <p className="text-xs text-gray-500 text-center">
            You're out of the running — here's how the eligible players are leaning.
          </p>

          <div className="grid grid-cols-2 gap-3">
            {(['away', 'home'] as const).map((side) => {
              const teamName = side === 'away' ? game.away_team : game.home_team
              const isFav = side === 'away' ? awayFav : homeFav
              const votes = side === 'away' ? awayVotes : homeVotes
              const pct = totalVotes > 0 ? Math.round((votes / totalVotes) * 100) : 0

              const resultWon =
                game.result_confirmed &&
                ((side === 'home' && game.result === 'home_win') ||
                  (side === 'away' && game.result === 'away_win'))
              const resultLost =
                game.result_confirmed && game.result !== 'push' &&
                !resultWon

              return (
                <div
                  key={side}
                  className={`flex flex-col items-center gap-2 p-3 rounded-xl bg-gray-800 ${
                    resultWon ? 'ring-2 ring-green-500' : resultLost ? 'opacity-50' : ''
                  }`}
                >
                  <TeamLogo name={teamName} size={44} />
                  <div className="text-center">
                    <p className="text-xs font-semibold text-white">{teamName.split(' ').pop()}</p>
                    <p className="text-xs text-gray-500">{spreadLabel(game.spread, isFav)}</p>
                  </div>
                  <span className="text-sm font-bold text-white">{pct}%</span>
                  <span className="text-xs text-gray-600">{votes} pick{votes !== 1 ? 's' : ''}</span>
                </div>
              )
            })}
          </div>

          {totalVotes === 0 && (
            <p className="text-xs text-gray-600 text-center">No picks submitted yet.</p>
          )}
        </div>
      )}
    </div>
  )
}
