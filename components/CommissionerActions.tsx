'use client'

import { useTransition, useState } from 'react'
import {
  fetchSchedule,
  fetchResults,
  fetchMNFLine,
  fetchMNFResult,
  postResultsAnnouncement,
  postTiebreakerAnnouncement,
  postTiebreakerResults,
  closeWeek,
  postAnnouncement,
  updateGameSpread,
  devResetWeekToWednesday,
  devSimulateThursdayDone,
  devSimulateSundayDone,
  devSimulateTiebreaker,
} from '@/app/actions/commissioner'

// ─── Fetch Schedule ───────────────────────────────────────────────────────────

export function FetchScheduleButton({
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
        await fetchSchedule(weekNumber, seasonYear)
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
        {pending ? 'Fetching schedule…' : `Fetch Week ${weekNumber} schedule`}
      </button>
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  )
}

// ─── Fetch Results ────────────────────────────────────────────────────────────

export function FetchResultsButton({ weekId }: { weekId: string }) {
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function handleFetch() {
    setError(null)
    startTransition(async () => {
      try {
        await fetchResults(weekId)
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
        className="w-full py-2.5 px-4 rounded-xl bg-gray-700 active:bg-gray-600 text-white text-sm font-semibold disabled:opacity-50 transition-colors"
      >
        {pending ? 'Fetching results…' : 'Fetch results from Odds API →'}
      </button>
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  )
}

// ─── Fetch MNF Line ───────────────────────────────────────────────────────────

export function FetchMNFLineButton({ weekId }: { weekId: string }) {
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function handleFetch() {
    setError(null)
    startTransition(async () => {
      try {
        await fetchMNFLine(weekId)
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
        {pending ? 'Fetching MNF line…' : 'Fetch MNF line →'}
      </button>
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  )
}

// ─── Fetch MNF Result ─────────────────────────────────────────────────────────

export function FetchMNFResultButton({ weekId }: { weekId: string }) {
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function handleFetch() {
    setError(null)
    startTransition(async () => {
      try {
        await fetchMNFResult(weekId)
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
        className="w-full py-2.5 px-4 rounded-xl bg-gray-700 active:bg-gray-600 text-white text-sm font-semibold disabled:opacity-50 transition-colors"
      >
        {pending ? 'Fetching MNF result…' : 'Fetch MNF result →'}
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

// ─── Results Announcement ─────────────────────────────────────────────────────

export function ResultsAnnouncementForm({
  weekId,
  perfectCount,
  threshold,
}: {
  weekId: string
  perfectCount: number
  threshold: number
}) {
  const [pending, startTransition] = useTransition()
  const [content, setContent] = useState('')
  const needsTiebreaker = perfectCount > threshold

  const placeholder = needsTiebreaker
    ? `${perfectCount} players went perfect — MNF tiebreaker is on. Here's how the week played out…`
    : perfectCount > 0
    ? `${perfectCount} perfect score${perfectCount > 1 ? 's' : ''} this week! Here's how the week played out…`
    : `Tough week — no perfect scores. Here's how the week played out…`

  function handlePost() {
    if (!content.trim()) return
    startTransition(async () => {
      await postResultsAnnouncement(weekId, content.trim())
    })
  }

  return (
    <div className="space-y-2">
      {needsTiebreaker && (
        <div className="flex items-start gap-2 p-3 bg-yellow-950/40 border border-yellow-900/50 rounded-xl">
          <span className="text-yellow-500 text-xs mt-0.5">⚡</span>
          <p className="text-xs text-yellow-400">
            {perfectCount} players went perfect — posting this will trigger the MNF tiebreaker.
          </p>
        </div>
      )}
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder={placeholder}
        rows={4}
        className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2.5 text-sm text-white placeholder-gray-600 resize-none focus:outline-none focus:border-gray-600"
      />
      <button
        onClick={handlePost}
        disabled={!content.trim() || pending}
        className={`w-full py-2.5 px-4 rounded-xl text-white text-sm font-semibold disabled:opacity-40 transition-colors ${
          needsTiebreaker
            ? 'bg-yellow-600 active:bg-yellow-700'
            : 'bg-green-600 active:bg-green-700'
        }`}
      >
        {pending
          ? 'Posting…'
          : needsTiebreaker
          ? 'Post results + launch tiebreaker →'
          : 'Post results + close week →'}
      </button>
    </div>
  )
}

// ─── Tiebreaker Launch Announcement ──────────────────────────────────────────

export function TiebreakerAnnouncementForm({
  weekId,
  eligibleNames,
}: {
  weekId: string
  eligibleNames: string[]
}) {
  const [pending, startTransition] = useTransition()
  const [content, setContent] = useState('')

  const names = eligibleNames.join(', ')
  const placeholder = `MNF tiebreaker is live. ${names ? `${names} — you're still in it.` : ''} Pick before kickoff.`

  function handlePost() {
    if (!content.trim()) return
    startTransition(async () => {
      await postTiebreakerAnnouncement(weekId, content.trim())
    })
  }

  return (
    <div className="space-y-2">
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder={placeholder}
        rows={4}
        className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2.5 text-sm text-white placeholder-gray-600 resize-none focus:outline-none focus:border-gray-600"
      />
      <button
        onClick={handlePost}
        disabled={!content.trim() || pending}
        className="w-full py-2.5 px-4 rounded-xl bg-blue-600 active:bg-blue-700 text-white text-sm font-semibold disabled:opacity-40 transition-colors"
      >
        {pending ? 'Posting…' : 'Post + open MNF picks →'}
      </button>
    </div>
  )
}

// ─── Tiebreaker Results Announcement ─────────────────────────────────────────

export function TiebreakerResultsForm({ weekId }: { weekId: string }) {
  const [pending, startTransition] = useTransition()
  const [content, setContent] = useState('')

  function handlePost() {
    if (!content.trim()) return
    startTransition(async () => {
      await postTiebreakerResults(weekId, content.trim())
    })
  }

  return (
    <div className="space-y-2">
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="MNF tiebreaker result is in. Here's who takes it…"
        rows={4}
        className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2.5 text-sm text-white placeholder-gray-600 resize-none focus:outline-none focus:border-gray-600"
      />
      <button
        onClick={handlePost}
        disabled={!content.trim() || pending}
        className="w-full py-2.5 px-4 rounded-xl bg-green-600 active:bg-green-700 text-white text-sm font-semibold disabled:opacity-40 transition-colors"
      >
        {pending ? 'Posting…' : 'Post tiebreaker results + close week →'}
      </button>
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

// ─── Dev Tools ────────────────────────────────────────────────────────────────

function DevButton({
  label,
  action,
}: {
  label: string
  action: () => Promise<void>
}) {
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  return (
    <div>
      <button
        onClick={() => {
          setError(null)
          startTransition(async () => {
            try { await action() } catch (e: any) { setError(e.message) }
          })
        }}
        disabled={pending}
        className="w-full py-2 px-3 rounded-lg bg-yellow-900/50 text-yellow-400 text-xs font-semibold disabled:opacity-50 active:bg-yellow-900 transition-colors text-left"
      >
        {pending ? '…' : label}
      </button>
      {error && <p className="text-xs text-red-400 mt-1">{error}</p>}
    </div>
  )
}

export function DevResetButton({ weekId, seasonYear }: { weekId: string; seasonYear: number }) {
  return (
    <div className="space-y-1.5">
      <p className="text-xs text-yellow-700 font-medium">Simulate weekly flow:</p>
      <DevButton
        label="↩ Reset (wipe everything)"
        action={() => devResetWeekToWednesday(weekId)}
      />
      <DevButton
        label="→ Thursday done — lines set, slate posted (test pre-SNF update)"
        action={() => devSimulateThursdayDone(weekId, seasonYear)}
      />
      <DevButton
        label="→ Sunday done — results scored (test writing results post)"
        action={() => devSimulateSundayDone(weekId, seasonYear)}
      />
      <DevButton
        label="→ Tiebreaker — results posted, MNF up (test full tiebreaker flow)"
        action={() => devSimulateTiebreaker(weekId, seasonYear)}
      />
    </div>
  )
}

// ─── Announcement Form (general / pre-SNF) ────────────────────────────────────

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
