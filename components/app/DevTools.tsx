'use client'

import { useState, useTransition } from 'react'
import { useLeague } from '@/lib/league/store'
import { devSetWeekStatus, devSetKickoffScenario } from '@/app/actions/dev'
import { cn } from '@/lib/utils'
import type { DayOfWeek } from '@/lib/league/types'

const DAYS: DayOfWeek[] = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const FOOTBALL_DAYS = new Set<DayOfWeek>(['Thu', 'Sun'])

const SCENARIOS = [
  { value: 'pre_thu',  label: 'Pre-Thu',  desc: 'All games upcoming' },
  { value: 'post_thu', label: 'Post-Thu', desc: 'TNF done, Sun open' },
  { value: 'pre_sun',  label: 'Pre-Sun',  desc: 'Sun games imminent' },
  { value: 'post_all', label: 'Post-All', desc: 'All games complete' },
] as const

const STATUSES = [
  { value: 'pending',          label: 'pending' },
  { value: 'open',             label: 'open' },
  { value: 'sunday_complete',  label: 'sun done' },
  { value: 'results_posted',   label: 'results' },
  { value: 'closed',           label: 'closed' },
]

export function DevTools() {
  const { sim, activeWeek, refresh, devSimDay, setDevSimDay } = useLeague()
  const [activeScenario, setActiveScenario] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  if (process.env.NODE_ENV !== 'development') return null

  const currentStatus = activeWeek?.status ?? 'no week'

  function handleScenario(scenario: typeof SCENARIOS[number]['value']) {
    startTransition(async () => {
      await devSetKickoffScenario(scenario)
      setActiveScenario(scenario)
      refresh()
    })
  }

  function handleStatus(status: string) {
    startTransition(async () => {
      await devSetWeekStatus(status)
      refresh()
    })
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-amber-500/30 bg-amber-950/95 backdrop-blur text-amber-100">
      <div className="mx-auto max-w-3xl px-3 py-2 space-y-1.5">

        {/* Row 1: label + state + refresh */}
        <div className="flex items-center gap-2">
          <span className="text-[9px] uppercase tracking-widest font-bold bg-amber-500 text-black px-1.5 py-0.5 rounded-sm shrink-0">
            DEV
          </span>
          <span className="font-mono text-[11px] text-amber-200/80">
            W{sim.currentWeek} · {sim.day}
            {devSimDay && <span className="text-amber-400"> (sim)</span>}
            {' · '}
            <span className={cn('font-bold', currentStatus === 'open' ? 'text-green-400' : 'text-amber-300')}>
              {currentStatus}
            </span>
          </span>
          {isPending && (
            <span className="text-[10px] text-amber-400 animate-pulse ml-1">updating…</span>
          )}
          <button
            onClick={refresh}
            className="ml-auto text-[10px] uppercase tracking-widest text-amber-400 hover:text-amber-200 font-bold"
          >
            ↺ Refresh
          </button>
        </div>

        {/* Row 2: Day selector */}
        <div className="flex items-center gap-2">
          <span className="text-[9px] uppercase tracking-widest text-amber-600 w-8 shrink-0">Day</span>
          <div className="flex items-center gap-1 flex-wrap">
            {DAYS.map((d) => {
              const isFootball = FOOTBALL_DAYS.has(d)
              const isActive = devSimDay === d
              return (
                <button
                  key={d}
                  onClick={() => setDevSimDay(isActive ? null : d)}
                  className={cn(
                    'text-[10px] font-mono font-bold px-2 py-0.5 rounded border transition-colors',
                    isActive
                      ? 'bg-amber-400 text-black border-amber-400'
                      : isFootball
                      ? 'border-amber-500/70 text-amber-300 hover:bg-amber-500/20'
                      : 'border-amber-800/60 text-amber-600 hover:bg-amber-800/30',
                  )}
                >
                  {d}
                </button>
              )
            })}
            {devSimDay && (
              <button
                onClick={() => setDevSimDay(null)}
                className="text-[10px] text-amber-600 hover:text-amber-300 px-1 ml-1"
              >
                ✕ reset
              </button>
            )}
          </div>
        </div>

        {/* Row 3: Kickoff time scenarios */}
        <div className="flex items-center gap-2">
          <span className="text-[9px] uppercase tracking-widest text-amber-600 w-8 shrink-0">Time</span>
          <div className="flex gap-1 flex-wrap">
            {SCENARIOS.map((s) => (
              <button
                key={s.value}
                onClick={() => handleScenario(s.value)}
                disabled={isPending}
                title={s.desc}
                className={cn(
                  'text-[10px] font-mono font-bold px-2 py-0.5 rounded border transition-colors',
                  activeScenario === s.value
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'border-amber-800/60 text-amber-400 hover:bg-amber-800/30 disabled:opacity-40',
                )}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        {/* Row 4: Week status */}
        <div className="flex items-center gap-2">
          <span className="text-[9px] uppercase tracking-widest text-amber-600 w-8 shrink-0">Wk</span>
          <div className="flex gap-1 flex-wrap">
            {STATUSES.map((s) => (
              <button
                key={s.value}
                onClick={() => handleStatus(s.value)}
                disabled={isPending}
                className={cn(
                  'text-[10px] font-mono font-bold px-2 py-0.5 rounded border transition-colors',
                  currentStatus === s.value
                    ? 'bg-green-700 text-white border-green-700'
                    : 'border-amber-800/60 text-amber-400 hover:bg-amber-800/30 disabled:opacity-40',
                )}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

      </div>
    </div>
  )
}
