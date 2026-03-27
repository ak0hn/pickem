'use client'

import { useState, useTransition } from 'react'
import { publishWeek, updateGameSpread, fetchAndSaveLines } from '@/app/actions/commissioner'

// ── Team data ─────────────────────────────────────────────────────────────────

type TeamInfo = { abbr: string; color: string; light?: boolean }

const NFL_TEAMS: Record<string, TeamInfo> = {
  'Arizona Cardinals':     { abbr: 'ARI', color: '#97233F' },
  'Atlanta Falcons':       { abbr: 'ATL', color: '#A71930' },
  'Baltimore Ravens':      { abbr: 'BAL', color: '#241773' },
  'Buffalo Bills':         { abbr: 'BUF', color: '#00338D' },
  'Carolina Panthers':     { abbr: 'CAR', color: '#0085CA' },
  'Chicago Bears':         { abbr: 'CHI', color: '#0B162A' },
  'Cincinnati Bengals':    { abbr: 'CIN', color: '#FB4F14' },
  'Cleveland Browns':      { abbr: 'CLE', color: '#311D00' },
  'Dallas Cowboys':        { abbr: 'DAL', color: '#003594' },
  'Denver Broncos':        { abbr: 'DEN', color: '#FB4F14' },
  'Detroit Lions':         { abbr: 'DET', color: '#0076B6' },
  'Green Bay Packers':     { abbr: 'GB',  color: '#203731' },
  'Houston Texans':        { abbr: 'HOU', color: '#03202F' },
  'Indianapolis Colts':    { abbr: 'IND', color: '#002C5F' },
  'Jacksonville Jaguars':  { abbr: 'JAX', color: '#006778' },
  'Kansas City Chiefs':    { abbr: 'KC',  color: '#E31837' },
  'Las Vegas Raiders':     { abbr: 'LV',  color: '#A5ACAF', light: true },
  'Los Angeles Chargers':  { abbr: 'LAC', color: '#0080C6' },
  'Los Angeles Rams':      { abbr: 'LAR', color: '#003594' },
  'Miami Dolphins':        { abbr: 'MIA', color: '#008E97' },
  'Minnesota Vikings':     { abbr: 'MIN', color: '#4F2683' },
  'New England Patriots':  { abbr: 'NE',  color: '#002244' },
  'New Orleans Saints':    { abbr: 'NO',  color: '#9F8958', light: true },
  'New York Giants':       { abbr: 'NYG', color: '#0B2265' },
  'New York Jets':         { abbr: 'NYJ', color: '#125740' },
  'Philadelphia Eagles':   { abbr: 'PHI', color: '#004C54' },
  'Pittsburgh Steelers':   { abbr: 'PIT', color: '#FFB612', light: true },
  'San Francisco 49ers':   { abbr: 'SF',  color: '#AA0000' },
  'Seattle Seahawks':      { abbr: 'SEA', color: '#002244' },
  'Tampa Bay Buccaneers':  { abbr: 'TB',  color: '#D50A0A' },
  'Tennessee Titans':      { abbr: 'TEN', color: '#0C2340' },
  'Washington Commanders': { abbr: 'WSH', color: '#5A1414' },
}

const ALL_NFL_TEAMS = Object.keys(NFL_TEAMS)

function getTeam(name: string): TeamInfo {
  return NFL_TEAMS[name] ?? { abbr: name.slice(0, 3).toUpperCase(), color: '#374151' }
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone: 'America/New_York',
  }).replace(':00', '').toLowerCase() + ' ET'
}

function formatDay(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', {
    timeZone: 'America/New_York',
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  })
}

// spread=0 means line not yet set → show "—"
function spreadLabel(spread: number, isFav: boolean) {
  if (spread === 0) return '—'
  return isFav ? `-${spread}` : `+${spread}`
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
}

// ── Team pill ─────────────────────────────────────────────────────────────────

function TeamPill({ name }: { name: string }) {
  const team = getTeam(name)
  return (
    <span
      className="inline-block px-2 py-0.5 rounded-md text-xs font-bold tracking-wide w-10 text-center"
      style={{
        backgroundColor: team.color,
        color: team.light ? '#111827' : '#ffffff',
      }}
    >
      {team.abbr}
    </span>
  )
}

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
    startTransition(async () => {
      await updateGameSpread(game.id, parsed, favorite)
      setSaved(true)
      setTimeout(() => { setSaved(false); onClose() }, 800)
    })
  }

  return (
    <div className="flex items-center gap-2 mt-1.5 mb-1 px-3 py-2 bg-gray-800 rounded-lg">
      {/* Favorite toggle */}
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
        placeholder=""
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
  )
}

// ── Compact game row ──────────────────────────────────────────────────────────

function GameRow({
  game,
  readOnly = false,
  isEditing,
  onToggleEdit,
}: {
  game: Game
  readOnly?: boolean
  isEditing?: boolean
  onToggleEdit?: () => void
}) {
  const awayFav = game.spread_favorite === 'away'
  const homeFav = game.spread_favorite === 'home'
  const lineSet = game.spread > 0

  const inner = (
    <>
      {/* Away team */}
      <div className="flex items-center gap-1.5">
        <TeamPill name={game.away_team} />
        <span className={`text-xs font-semibold tabular-nums px-1.5 py-0.5 rounded bg-gray-800 ${awayFav && lineSet ? 'text-white' : 'text-gray-500'}`}>
          {spreadLabel(game.spread, awayFav)}
        </span>
      </div>

      <span className="text-gray-700 text-xs mx-1">@</span>

      {/* Home team */}
      <div className="flex items-center gap-1.5">
        <TeamPill name={game.home_team} />
        <span className={`text-xs font-semibold tabular-nums px-1.5 py-0.5 rounded bg-gray-800 ${homeFav && lineSet ? 'text-white' : 'text-gray-500'}`}>
          {spreadLabel(game.spread, homeFav)}
        </span>
      </div>

      {/* Time + tiebreaker label */}
      <div className="flex items-center gap-1.5 ml-auto pl-2 flex-shrink-0">
        {game.is_tiebreaker && (
          <span className="text-xs text-gray-600 bg-gray-800 px-1.5 py-0.5 rounded">TB</span>
        )}
        <span className="text-xs text-gray-500">{formatTime(game.kickoff_time)}</span>
      </div>
    </>
  )

  const canEdit = !readOnly

  return (
    <div className={game.is_tiebreaker ? 'opacity-60' : ''}>
      {canEdit ? (
        <button
          onClick={onToggleEdit}
          className="w-full flex items-center justify-between py-2 active:opacity-60 transition-opacity text-left"
        >
          {inner}
        </button>
      ) : (
        <div className="w-full flex items-center justify-between py-2">{inner}</div>
      )}
      {canEdit && isEditing && <SpreadEditor game={game} onClose={() => onToggleEdit?.()} />}
    </div>
  )
}

// ── Publish block ─────────────────────────────────────────────────────────────

function PublishBlock({ weekId, weekNumber, allLinesSet }: { weekId: string; weekNumber: number; allLinesSet: boolean }) {
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
      <button
        onClick={handlePublish}
        disabled={pending || !allLinesSet}
        className="w-full py-3 rounded-xl bg-green-600 active:bg-green-700 text-white text-sm font-semibold disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
      >
        {pending ? 'Opening…' : allLinesSet ? 'Ship the slate — let \'em cook →' : 'Pull lines first, then we cook →'}
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
}

export default function SlateReview({ weekId, weekNumber, seasonYear, games, readOnly = false }: Props) {
  const dayMap = new Map<string, Game[]>()
  for (const game of games) {
    const label = formatDay(game.kickoff_time)
    if (!dayMap.has(label)) dayMap.set(label, [])
    dayMap.get(label)!.push(game)
  }
  const dayGroups = Array.from(dayMap.entries())

  const unsetCount = games.filter((g) => !g.is_tiebreaker && g.spread === 0).length

  // Bye teams — only relevant if < 32 teams are playing
  const playingTeams = new Set(games.flatMap((g) => [g.home_team, g.away_team]))
  const byeTeams = ALL_NFL_TEAMS.filter((t) => !playingTeams.has(t))

  const allLinesSet = unsetCount === 0

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

      {/* Publish form — above the slate so it's the first thing commissioner sees */}
      {!readOnly && (
        <PublishBlock weekId={weekId} weekNumber={weekNumber} allLinesSet={allLinesSet} />
      )}

      {/* Slate card — sync button anchored to top-right corner */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl relative">
        {!readOnly && seasonYear && (
          <button
            onClick={() => startRefresh(() => fetchAndSaveLines(weekNumber, seasonYear))}
            disabled={refreshing}
            title={allLinesSet ? 'Refresh lines' : 'Fetch lines'}
            className="absolute top-3 right-4 text-gray-600 active:text-gray-300 disabled:opacity-40 transition-colors text-base leading-none z-10"
          >
            {refreshing ? '…' : '↻'}
          </button>
        )}

        <div className="px-4 divide-y divide-gray-800/60">
          {dayGroups.map(([dayLabel, dayGames]) => (
            <div key={dayLabel}>
              <p className="text-xs font-semibold text-gray-600 uppercase tracking-widest pt-3 pb-1">
                {dayLabel}
              </p>
              {dayGames.map((game) => (
                <GameRow
                  key={game.id}
                  game={game}
                  readOnly={effectiveReadOnly}
                  isEditing={editingId === game.id}
                  onToggleEdit={() => setEditingId(editingId === game.id ? null : game.id)}
                />
              ))}
            </div>
          ))}

          {byeTeams.length > 0 && (
            <div className="py-3 space-y-2">
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
      </div>
    </div>
  )
}
