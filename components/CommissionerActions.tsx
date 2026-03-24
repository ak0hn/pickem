'use client'

import { useTransition, useState } from 'react'
import {
  fetchAndSaveLines,
  postResults,
  closeWeek,
  postAnnouncement,
  updateGameSpread,
  devResetWeekToWednesday,
} from '@/app/actions/commissioner'

// ─── Fetch Lines ─────────────────────────────────────────────────────────────

export function FetchLinesButton({
  weekNumber,
  seasonYear,
}: {
  weekNumber: number
  seasonYear: number
}) {
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function handleFetch() {
    setError(null)
    startTransition(async () => {
      try {
        await fetchAndSaveLines(weekNumber, seasonYear)
      } catch (e: any) {
        setError(e.message ?? 'Something went wrong')
      }
    })
  }

  return (
    <div className="space-y-2">
      <button
        onClick={handleFetch}
        disabled={pending}
        className="w-full py-2.5 px-4 rounded-xl bg-blue-600 active:bg-blue-700 text-white text-sm font-semibold disabled:opacity-50 transition-colors"
      >
        {pending ? 'Fetching lines…' : `Fetch Week ${weekNumber} lines`}
      </button>
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  )
}

// ─── Editable Spread ──────────────────────────────────────────────────────────

export function EditableSpread({
  gameId,
  homeTeam,
  awayTeam,
  initialSpread,
  initialFavorite,
}: {
  gameId: string
  homeTeam: string
  awayTeam: string
  initialSpread: number
  initialFavorite: 'home' | 'away'
}) {
  const [pending, startTransition] = useTransition()
  const [spread, setSpread] = useState(String(initialSpread))
  const [favorite, setFavorite] = useState<'home' | 'away'>(initialFavorite)
  const [saved, setSaved] = useState(false)

  const homeShort = homeTeam.split(' ').pop()!
  const awayShort = awayTeam.split(' ').pop()!

  function handleSave() {
    const parsed = parseFloat(spread)
    if (isNaN(parsed) || parsed <= 0) return
    startTransition(async () => {
      await updateGameSpread(gameId, parsed, favorite)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    })
  }

  return (
    <div className="flex items-center gap-2">
      {/* Favorite toggle */}
      <div className="flex rounded-lg overflow-hidden border border-gray-700 text-xs">
        {(['away', 'home'] as const).map((side) => (
          <button
            key={side}
            onClick={() => { setFavorite(side); setSaved(false) }}
            className={`px-2.5 py-1.5 font-medium transition-colors ${
              favorite === side
                ? 'bg-white text-gray-950'
                : 'bg-gray-800 text-gray-400'
            }`}
          >
            {side === 'home' ? homeShort : awayShort}
          </button>
        ))}
      </div>

      {/* Spread input */}
      <div className="flex items-center gap-1">
        <span className="text-xs text-gray-500">-</span>
        <input
          type="number"
          value={spread}
          onChange={(e) => { setSpread(e.target.value); setSaved(false) }}
          step="0.5"
          min="0.5"
          className="w-14 bg-gray-800 border border-gray-700 rounded-lg px-2 py-1.5 text-xs text-white text-center focus:outline-none focus:border-gray-500"
        />
      </div>

      {/* Save */}
      <button
        onClick={handleSave}
        disabled={pending}
        className="text-xs text-blue-400 active:text-blue-300 disabled:opacity-40 font-medium"
      >
        {saved ? 'Saved ✓' : pending ? '…' : 'Save'}
      </button>
    </div>
  )
}

// ─── Post Results ─────────────────────────────────────────────────────────────

type Game = {
  id: string
  home_team: string
  away_team: string
  result: string
}

export function PostResultsForm({
  weekId,
  games,
}: {
  weekId: string
  games: Game[]
}) {
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [gameResults, setGameResults] = useState<
    Record<string, 'home_win' | 'away_win' | 'push' | ''>
  >(Object.fromEntries(games.map((g) => [g.id, g.result !== 'pending' ? (g.result as any) : ''])))

  const allSet = games.every((g) => gameResults[g.id])

  function handleSubmit() {
    setError(null)
    startTransition(async () => {
      try {
        const results = games
          .filter((g) => gameResults[g.id])
          .map((g) => ({
            gameId: g.id,
            result: gameResults[g.id] as 'home_win' | 'away_win' | 'push',
          }))
        await postResults(weekId, results)
      } catch (e: any) {
        setError(e.message ?? 'Something went wrong')
      }
    })
  }

  return (
    <div className="space-y-3">
      {games.map((game) => (
        <div key={game.id} className="space-y-1.5">
          <p className="text-xs text-gray-400">
            {game.away_team} @ {game.home_team}
          </p>
          <div className="grid grid-cols-3 gap-1.5">
            {[
              { value: 'away_win', label: game.away_team.split(' ').pop()! },
              { value: 'home_win', label: game.home_team.split(' ').pop()! },
              { value: 'push', label: 'Push' },
            ].map(({ value, label }) => (
              <button
                key={value}
                onClick={() =>
                  setGameResults((prev) => ({
                    ...prev,
                    [game.id]: value as any,
                  }))
                }
                className={`py-1.5 px-2 rounded-lg text-xs font-medium transition-colors ${
                  gameResults[game.id] === value
                    ? 'bg-white text-gray-950'
                    : 'bg-gray-800 text-gray-400 active:bg-gray-700'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      ))}

      <button
        onClick={handleSubmit}
        disabled={!allSet || pending}
        className="w-full py-2.5 px-4 rounded-xl bg-green-600 active:bg-green-700 text-white text-sm font-semibold disabled:opacity-40 transition-colors mt-2"
      >
        {pending ? 'Posting results…' : 'Confirm & post results →'}
      </button>
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  )
}

// ─── Close Week ───────────────────────────────────────────────────────────────

export function CloseWeekButton({ weekId }: { weekId: string }) {
  const [pending, startTransition] = useTransition()

  return (
    <button
      onClick={() => startTransition(() => closeWeek(weekId))}
      disabled={pending}
      className="w-full py-2.5 px-4 rounded-xl bg-gray-700 active:bg-gray-600 text-white text-sm font-semibold disabled:opacity-50 transition-colors"
    >
      {pending ? 'Closing…' : 'Close week'}
    </button>
  )
}

// ─── Dev Reset ────────────────────────────────────────────────────────────────

export function DevResetButton({ weekId }: { weekId: string }) {
  const [pending, startTransition] = useTransition()
  return (
    <button
      onClick={() => startTransition(() => devResetWeekToWednesday(weekId))}
      disabled={pending}
      className="w-full py-2 px-4 rounded-lg bg-yellow-900/50 text-yellow-500 text-xs font-semibold disabled:opacity-50 active:bg-yellow-900 transition-colors"
    >
      {pending ? 'Resetting…' : 'Simulate Wednesday (open + fresh mock)'}
    </button>
  )
}

// ─── Announcement Form ────────────────────────────────────────────────────────

export function AnnouncementForm({
  weekId,
  placeholder,
  type = 'general',
  label = 'Post announcement',
}: {
  weekId: string | null
  placeholder: string
  type?: string
  label?: string
}) {
  const [pending, startTransition] = useTransition()
  const [content, setContent] = useState('')
  const [sent, setSent] = useState(false)

  function handlePost() {
    if (!content.trim()) return
    startTransition(async () => {
      await postAnnouncement(weekId, content.trim(), type)
      setContent('')
      setSent(true)
      setTimeout(() => setSent(false), 3000)
    })
  }

  return (
    <div className="space-y-2">
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder={placeholder}
        rows={3}
        className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2.5 text-sm text-white placeholder-gray-600 resize-none focus:outline-none focus:border-gray-600"
      />
      <button
        onClick={handlePost}
        disabled={!content.trim() || pending}
        className="w-full py-2.5 px-4 rounded-xl bg-blue-600 active:bg-blue-700 text-white text-sm font-semibold disabled:opacity-40 transition-colors"
      >
        {sent ? 'Posted ✓' : pending ? 'Posting…' : label}
      </button>
    </div>
  )
}
