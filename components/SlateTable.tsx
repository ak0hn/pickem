'use client'

import { useState, useTransition } from 'react'
import { getWeekGames } from '@/app/actions/feed'
import { getTeam } from '@/lib/nfl/teams'

function formatKickoff(iso: string) {
  const d = new Date(iso)
  const days = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT']
  const h = d.getHours() % 12 || 12
  const m = d.getMinutes()
  return `${days[d.getDay()]} ${h}:${String(m).padStart(2, '0')}`
}

function formatSpread(spread: number, favorite: 'home' | 'away') {
  return favorite === 'home' ? `-${spread}` : `+${spread}`
}

export default function SlateTable({
  weekId,
  isTiebreaker,
}: {
  weekId: string
  isTiebreaker: boolean
}) {
  const [expanded, setExpanded] = useState(false)
  const [games, setGames] = useState<any[]>([])
  const [pending, startTransition] = useTransition()

  function handleToggle(e: React.MouseEvent) {
    e.stopPropagation()
    if (!expanded) {
      startTransition(async () => {
        const data = await getWeekGames(weekId, isTiebreaker)
        setGames(data)
        setExpanded(true)
      })
    } else {
      setExpanded(false)
    }
  }

  return (
    <div className="space-y-2" onClick={(e) => e.stopPropagation()}>
      <button
        onClick={handleToggle}
        disabled={pending}
        className="text-xs text-blue-400 active:text-blue-300 font-medium disabled:opacity-50 transition-colors"
      >
        {pending ? 'Loading…' : expanded ? 'Hide lines ↑' : 'View lines ↓'}
      </button>

      {expanded && games.length > 0 && (
        <div className="rounded-lg overflow-hidden border border-gray-700">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr style={{ backgroundColor: '#374151' }}>
                <th className="px-2 py-1.5 text-left font-semibold text-gray-300 whitespace-nowrap">KICKOFF</th>
                <th className="px-2 py-1.5 text-center font-semibold text-gray-300">AWAY</th>
                <th className="px-2 py-1.5 text-center font-semibold text-gray-300">HOME</th>
                <th className="px-2 py-1.5 text-right font-semibold text-gray-300">LINE</th>
              </tr>
            </thead>
            <tbody>
              {games.map((g, i) => {
                const away = getTeam(g.away_team)
                const home = getTeam(g.home_team)
                const spread = formatSpread(g.spread, g.spread_favorite)
                const kickoff = formatKickoff(g.kickoff_time)
                const rowBg = i % 2 === 0 ? '#1f2937' : '#1a2030'

                return (
                  <tr key={g.id} style={{ backgroundColor: rowBg }}>
                    <td className="px-2 py-1.5 font-mono text-gray-400 whitespace-nowrap">{kickoff}</td>
                    <td className="px-2 py-1 text-center">
                      <span
                        className="inline-block px-1.5 py-0.5 rounded font-mono font-bold tracking-wide"
                        style={{
                          backgroundColor: away.color,
                          color: away.light ? '#111827' : '#ffffff',
                        }}
                      >
                        {away.abbr.toLowerCase()}
                      </span>
                    </td>
                    <td className="px-2 py-1 text-center">
                      <span
                        className="inline-block px-1.5 py-0.5 rounded font-mono font-bold tracking-wide"
                        style={{
                          backgroundColor: home.color,
                          color: home.light ? '#111827' : '#ffffff',
                        }}
                      >
                        {home.abbr}
                      </span>
                    </td>
                    <td className="px-2 py-1.5 text-right font-mono font-semibold text-white whitespace-nowrap">
                      {spread}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
