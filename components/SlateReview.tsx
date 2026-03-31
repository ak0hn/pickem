'use client'

import { useState, useTransition } from 'react'
import { publishWeek, updateGameSpread, fetchAndSaveLines } from '@/app/actions/commissioner'
import { getTeam, ALL_NFL_TEAMS } from '@/lib/nfl/teams'

function formatKickoff(iso: string) {
  const d = new Date(iso)
  const days = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT']
  const h = d.getHours() % 12 || 12
  const m = d.getMinutes()
  return `${days[d.getDay()]} ${h}:${String(m).padStart(2, '0')}`
}

function homeSpreadLabel(spread: number, favorite: 'home' | 'away' | string) {
  if (spread === 0) return '—'
  const n = Number.isInteger(spread) ? `${spread}` : `${spread}`
  return favorite === 'home' ? `-${n}` : `+${n}`
}

// ── Types ─────────────────────────────────────────────────────────────────────

type Game = {
  id: string
  home_team: string
  away_team: string
  spread: number
  spread_favorite: string
  kickoff_time: string
  is_tiebreaker: boolean
  result?: string
  result_confirmed?: boolean
}

type PickTally = { home: number; away: number }

// ── Inline spread editor ──────────────────────────────────────────────────────

function SpreadEditor({ game, onClose }: { game: Game; onClose: () => void }) {
  const [pending, startTransition] = useTransition()
  const [spread, setSpread] = useState(game.spread === 0 ? '' : String(game.spread))
  const [favorite, setFavorite] = useState<'home' | 'away'>(game.spread_favorite as 'home' | 'away')
  const [saved, setSaved] = useState(false)

  const awayTeam = getTeam(game.away_team)
  const homeTeam = getTeam(game.home_team)

  function handleSave() {
    const parsed = parseFloat(spread)
    if (isNaN(parsed) || parsed < 0) return
    if (Math.round(parsed * 10) % 5 !== 0) return
    startTransition(async () => {
      await updateGameSpread(game.id, parsed, favorite)
      setSaved(true)
      setTimeout(() => { setSaved(false); onClose() }, 800)
    })
  }

  return (
    <tr>
      <td colSpan={5} className="px-3 pb-2">
        <div className="flex items-center gap-2 px-3 py-2 bg-gray-800 rounded-lg mt-0.5">
          <div className="flex rounded-lg overflow-hidden border border-gray-700 text-xs">
            {(['away', 'home'] as const).map((side) => {
              const team = side === 'away' ? awayTeam : homeTeam
              return (
                <button
                  key={side}
                  onClick={() => setFavorite(side)}
                  className="px-2.5 py-1.5 font-bold transition-colors"
                  style={
                    favorite === side
                      ? { backgroundColor: team.color, color: team.light ? '#111' : '#fff' }
                      : { backgroundColor: 'transparent', color: '#9ca3af' }
                  }
                >
                  {team.abbr}
                </button>
              )
            })}
          </div>
          <span className="text-gray-600 text-xs">by</span>
          <input
            type="number"
            value={spread}
            onChange={(e) => setSpread(e.target.value)}
            step="0.5"
            min="0"
            className="w-16 bg-gray-900 border border-gray-700 rounded-lg px-2 py-1.5 text-xs text-white text-center focus:outline-none focus:border-gray-600"
          />
          <button
            onClick={handleSave}
            disabled={pending}
            className="text-xs text-blue-400 font-semibold disabled:opacity-40 ml-1"
          >
            {saved ? '✓' : pending ? '…' : 'Save'}
          </button>
          <button onClick={onClose} className="text-xs text-gray-600 ml-auto">✕</button>
        </div>
      </td>
    </tr>
  )
}

// ── Game row ──────────────────────────────────────────────────────────────────

function GameRow({
  game,
  index,
  readOnly = false,
  isEditing,
  onToggleEdit,
  tally,
}: {
  game: Game
  index: number
  readOnly?: boolean
  isEditing?: boolean
  onToggleEdit?: () => void
  tally?: PickTally
}) {
  const away = getTeam(game.away_team)
  const home = getTeam(game.home_team)
  const isFinal = game.result_confirmed === true
  const homeWon = game.result === 'home_win'
  const awayWon = game.result === 'away_win'
  const rowBg = index % 2 === 0 ? '#1f2937' : '#1a2030'
  const lineLabel = homeSpreadLabel(game.spread, game.spread_favorite)

  const cells = (
    <tr
      style={{ backgroundColor: rowBg }}
      onClick={!readOnly ? onToggleEdit : undefined}
      className={!readOnly ? 'cursor-pointer active:opacity-70 transition-opacity' : ''}
    >
      {/* Kickoff */}
      <td className="px-2 py-1.5 font-mono text-xs text-gray-400 whitespace-nowrap">
        {game.is_tiebreaker
          ? <span className="text-yellow-500">{formatKickoff(game.kickoff_time)}</span>
          : formatKickoff(game.kickoff_time)
        }
      </td>

      {/* Away team */}
      <td className="px-2 py-1 text-center">
        <span
          className="inline-block px-1.5 py-0.5 rounded font-mono font-bold text-xs tracking-wide transition-opacity"
          style={{
            backgroundColor: away.color,
            color: away.light ? '#111827' : '#ffffff',
            opacity: isFinal && !awayWon ? 0.35 : 1,
          }}
        >
          {away.abbr.toLowerCase()}
        </span>
      </td>

      {/* Home team */}
      <td className="px-2 py-1 text-center">
        <span
          className="inline-block px-1.5 py-0.5 rounded font-mono font-bold text-xs tracking-wide transition-opacity"
          style={{
            backgroundColor: home.color,
            color: home.light ? '#111827' : '#ffffff',
            opacity: isFinal && !homeWon ? 0.35 : 1,
          }}
        >
          {home.abbr}
        </span>
      </td>

      {/* Line */}
      <td className="px-2 py-1.5 text-right font-mono text-xs font-semibold text-white whitespace-nowrap">
        {lineLabel}
      </td>

      {/* Status */}
      <td className="px-2 py-1.5 text-right text-xs whitespace-nowrap">
        {isFinal
          ? <span className="text-gray-600">Final</span>
          : null
        }
      </td>
    </tr>
  )

  const tallyBar = tally && (tally.home + tally.away) > 0 ? (
    <tr style={{ backgroundColor: rowBg }}>
      <td colSpan={5} className="px-3 pb-1.5">
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-600 tabular-nums w-4 text-right">{tally.away}</span>
          <div className="flex-1 flex h-1 rounded-full overflow-hidden bg-gray-700">
            <div
              className="bg-blue-500/50 h-full transition-all"
              style={{ width: `${(tally.away / (tally.away + tally.home)) * 100}%` }}
            />
          </div>
          <span className="text-xs text-gray-600 tabular-nums w-4">{tally.home}</span>
        </div>
      </td>
    </tr>
  ) : null

  return (
    <>
      {cells}
      {isEditing && <SpreadEditor game={game} onClose={() => onToggleEdit?.()} />}
      {tallyBar}
    </>
  )
}

// ── Publish block ─────────────────────────────────────────────────────────────

function PublishBlock({ weekId, weekNumber, allLinesSet, unsetCount }: {
  weekId: string
  weekNumber: number
  allLinesSet: boolean
  unsetCount: number
}) {
  const [pending, startTransition] = useTransition()
  const [message, setMessage] = useState('')
  const [error, setError] = useState<string | null>(null)

  const placeholder = `Week ${weekNumber} is live — picks are open. Good luck.`

  function handlePublish() {
    if (!allLinesSet) return
    const content = message.trim() || placeholder
    setError(null)
    startTransition(async () => {
      try {
        await publishWeek(weekId, content)
      } catch (e: any) {
        setError(e.message ?? 'Something went wrong')
      }
    })
  }

  return (
    <div className="space-y-2">
      <textarea
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder={placeholder}
        rows={3}
        className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2.5 text-sm text-white placeholder-gray-600 resize-none focus:outline-none focus:border-gray-600"
      />
      {!allLinesSet && (
        <p className="text-xs text-yellow-500">
          {unsetCount} game{unsetCount > 1 ? 's' : ''} still need lines — sync again or tap to set manually.
        </p>
      )}
      <button
        onClick={handlePublish}
        disabled={pending || !allLinesSet}
        className="w-full py-3 rounded-xl bg-green-600 active:bg-green-700 text-white text-sm font-semibold disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
      >
        {pending ? 'Opening…' : allLinesSet ? "Ship the slate — let 'em cook →" : `${unsetCount} line${unsetCount > 1 ? 's' : ''} missing — can't publish yet`}
      </button>
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  )
}

// ── SlateReview ───────────────────────────────────────────────────────────────

type Props = {
  weekId: string
  weekNumber: number
  seasonYear?: number
  games: Game[]
  readOnly?: boolean
  pickTallies?: Record<string, PickTally>
}

export default function SlateReview({ weekId, weekNumber, seasonYear, games, readOnly = false, pickTallies }: Props) {
  const unsetCount = games.filter((g) => !g.is_tiebreaker && g.spread === 0).length
  const allLinesSet = unsetCount === 0

  const playingTeams = new Set(games.flatMap((g) => [g.home_team, g.away_team]))
  const byeTeams = ALL_NFL_TEAMS.filter((t) => !playingTeams.has(t))

  const [editingId, setEditingId] = useState<string | null>(null)
  const [editMode, setEditMode] = useState(false)
  const [refreshing, startRefresh] = useTransition()

  const effectiveReadOnly = readOnly && !editMode

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-white">Week {weekNumber}</span>
        {!readOnly ? (
          <span className="text-xs text-yellow-500 bg-yellow-500/10 px-2 py-0.5 rounded-full">
            {allLinesSet ? 'Draft — tap a game to edit line' : 'Draft — lines TBD'}
          </span>
        ) : (
          <button
            onClick={() => { setEditMode(v => !v); setEditingId(null) }}
            className="text-xs text-gray-600 active:text-gray-400 transition-colors"
          >
            {editMode ? 'Done' : 'Edit lines'}
          </button>
        )}
      </div>

      {/* Publish form */}
      {!readOnly && (
        <PublishBlock weekId={weekId} weekNumber={weekNumber} allLinesSet={allLinesSet} unsetCount={unsetCount} />
      )}

      {/* Slate table */}
      <div className="rounded-lg overflow-hidden border border-gray-700 relative">
        {/* Sync button */}
        {!readOnly && seasonYear && (
          <button
            onClick={() => startRefresh(() => fetchAndSaveLines(weekNumber, seasonYear))}
            disabled={refreshing}
            title={allLinesSet ? 'Refresh lines' : 'Fetch lines'}
            className="absolute top-1.5 right-2 text-gray-500 active:text-gray-300 disabled:opacity-40 transition-colors text-base leading-none z-10"
          >
            {refreshing ? '…' : '↻'}
          </button>
        )}

        <table className="w-full text-xs border-collapse">
          <thead>
            <tr style={{ backgroundColor: '#374151' }}>
              <th className="px-2 py-1.5 text-left font-semibold text-gray-300 whitespace-nowrap">KICKOFF</th>
              <th className="px-2 py-1.5 text-center font-semibold text-gray-300">AWAY</th>
              <th className="px-2 py-1.5 text-center font-semibold text-gray-300">HOME</th>
              <th className="px-2 py-1.5 text-right font-semibold text-gray-300">LINE</th>
              <th className="px-2 py-1.5 text-right font-semibold text-gray-300"></th>
            </tr>
          </thead>
          <tbody>
            {games.map((game, i) => (
              <GameRow
                key={game.id}
                game={game}
                index={i}
                readOnly={effectiveReadOnly}
                isEditing={editingId === game.id}
                onToggleEdit={() => setEditingId(editingId === game.id ? null : game.id)}
                tally={pickTallies?.[game.id]}
              />
            ))}
          </tbody>
        </table>
      </div>

      {/* Bye teams */}
      {byeTeams.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-xs font-semibold text-gray-600 uppercase tracking-widest">Bye</p>
          <div className="flex flex-wrap gap-1.5">
            {byeTeams.map((name) => {
              const team = getTeam(name)
              return (
                <span
                  key={name}
                  className="px-2 py-0.5 rounded-md text-xs font-bold opacity-40"
                  style={{ backgroundColor: team.color, color: team.light ? '#111' : '#fff' }}
                >
                  {team.abbr}
                </span>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
