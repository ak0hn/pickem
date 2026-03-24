'use client'

import { useTransition, useState } from 'react'
import { invitePlayer, updateFetchHours, updatePushCountsAs } from '@/app/actions/commissioner'

const HOUR_OPTIONS = [6, 8, 12, 18, 24]

export function FetchHoursSetting({ current }: { current: number }) {
  const [pending, startTransition] = useTransition()
  const [value, setValue] = useState(current)

  function handleChange(hours: number) {
    setValue(hours)
    startTransition(() => updateFetchHours(hours))
  }

  return (
    <div className="px-4 py-3 space-y-2">
      <div>
        <p className="text-sm text-gray-300">Fetch lines before TNF kickoff</p>
        <p className="text-xs text-gray-600 mt-0.5">
          Lines are pulled automatically at this window — your review buffer before picks open
        </p>
      </div>
      <div className="flex gap-2 pt-1">
        {HOUR_OPTIONS.map((h) => (
          <button
            key={h}
            onClick={() => handleChange(h)}
            disabled={pending}
            className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-colors disabled:opacity-50 ${
              value === h
                ? 'bg-white text-gray-950'
                : 'bg-gray-800 text-gray-400 active:bg-gray-700'
            }`}
          >
            {h}h
          </button>
        ))}
      </div>
    </div>
  )
}

export function PushCountsAsSetting({ current }: { current: 'win' | 'tie' }) {
  const [pending, startTransition] = useTransition()
  const [value, setValue] = useState(current)

  function handleChange(next: 'win' | 'tie') {
    setValue(next)
    startTransition(() => updatePushCountsAs(next))
  }

  return (
    <div className="px-4 py-3 space-y-2">
      <div>
        <p className="text-sm text-gray-300">Push counts as</p>
        <p className="text-xs text-gray-600 mt-0.5">
          {value === 'win'
            ? 'A push (tie against the spread) counts as a correct pick'
            : 'A push does not count — player needs a clear win to stay alive'}
        </p>
      </div>
      <div className="flex gap-2">
        {(['win', 'tie'] as const).map((opt) => (
          <button
            key={opt}
            onClick={() => handleChange(opt)}
            disabled={pending}
            className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-colors disabled:opacity-50 ${
              value === opt
                ? 'bg-white text-gray-950'
                : 'bg-gray-800 text-gray-400 active:bg-gray-700'
            }`}
          >
            {opt === 'win' ? 'Win' : 'Tie (no credit)'}
          </button>
        ))}
      </div>
    </div>
  )
}

export function InvitePlayerForm() {
  const [pending, startTransition] = useTransition()
  const [email, setEmail] = useState('')
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function handleInvite() {
    if (!email.trim()) return
    setError(null)
    setSuccess(false)
    startTransition(async () => {
      try {
        await invitePlayer(email.trim())
        setEmail('')
        setSuccess(true)
        setTimeout(() => setSuccess(false), 4000)
      } catch (e: any) {
        setError(e.message ?? 'Something went wrong')
      }
    })
  }

  return (
    <div className="space-y-2">
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="player@email.com"
        className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-gray-600"
        onKeyDown={(e) => e.key === 'Enter' && handleInvite()}
      />
      <button
        onClick={handleInvite}
        disabled={!email.trim() || pending}
        className="w-full py-2.5 px-4 rounded-xl bg-blue-600 active:bg-blue-700 text-white text-sm font-semibold disabled:opacity-40 transition-colors"
      >
        {success ? 'Invite sent ✓' : pending ? 'Sending…' : 'Send invite'}
      </button>
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  )
}
