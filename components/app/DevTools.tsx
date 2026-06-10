'use client'

import { useState, useTransition } from 'react'
import { useLeague } from '@/lib/league/store'
import { devSetScenario, type Scenario } from '@/app/actions/dev'
import { cn } from '@/lib/utils'

const SCENARIOS: { value: Scenario; label: string; desc: string }[] = [
  { value: 'wed',       label: 'Wed',       desc: 'No lines pulled — commish sees Pull Lines CTA'     },
  { value: 'thu_am',   label: 'Thu AM',    desc: 'Lines pulled, commish in review, not published'    },
  { value: 'thu_open', label: 'Thu Open',  desc: 'Picks live — TNF 2h away, Sun games open'          },
  { value: 'thu_night',label: 'Thu Night', desc: 'TNF locked, Sun picks still open'                  },
  { value: 'sun_am',   label: 'Sun AM',    desc: 'Sun kickoff in 1h — last chance to pick'           },
  { value: 'sun_night',label: 'Sun Night', desc: 'All games done — commish hasn\'t posted results'   },
  { value: 'mon',      label: 'Mon',       desc: 'Results posted — players see W/L'                  },
  { value: 'closed',   label: 'Closed',    desc: 'Week closed — all picks visible to everyone'       },
]

export function DevTools() {
  const { sim, activeWeek, refresh, setDevSimDay } = useLeague()
  const [activeScenario, setActiveScenario] = useState<Scenario | null>(null)
  const [isPending, startTransition] = useTransition()

  if (process.env.NODE_ENV !== 'development') return null

  function handleScenario(scenario: Scenario) {
    startTransition(async () => {
      const { day } = await devSetScenario(scenario)
      setDevSimDay(day)
      setActiveScenario(scenario)
      refresh()
    })
  }

  const currentStatus = activeWeek?.status ?? 'no week'

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-amber-500/30 bg-amber-950/95 backdrop-blur">
      <div className="mx-auto max-w-3xl px-3 py-2 space-y-1.5">

        {/* Row 1: state summary + refresh */}
        <div className="flex items-center gap-2">
          <span className="text-[9px] uppercase tracking-widest font-bold bg-amber-500 text-black px-1.5 py-0.5 rounded-sm shrink-0">
            DEV
          </span>
          <span className="font-mono text-[11px] text-amber-200/70">
            W{sim.currentWeek} · {sim.day} · {' '}
            <span className={cn('font-bold', currentStatus === 'open' ? 'text-green-400' : 'text-amber-300')}>
              {currentStatus}
            </span>
          </span>
          {isPending && (
            <span className="text-[10px] text-amber-400 animate-pulse">updating…</span>
          )}
          <button
            onClick={refresh}
            className="ml-auto text-[11px] text-amber-500 hover:text-amber-200 font-bold"
          >
            ↺
          </button>
        </div>

        {/* Row 2: week scenarios */}
        <div className="flex items-center gap-2">
          <span className="text-[9px] uppercase tracking-widest text-amber-700 shrink-0">Sim</span>
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
                    ? 'bg-amber-400 text-black border-amber-400'
                    : 'border-amber-800/50 text-amber-500 hover:border-amber-500/70 hover:text-amber-300 disabled:opacity-30',
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
