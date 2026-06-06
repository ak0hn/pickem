'use client'

import { useLeague } from '@/lib/league/store'
import { Button } from '@/components/ui/button'
import type { DayOfWeek } from '@/lib/league/types'

const DAYS: DayOfWeek[] = ['Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun', 'Mon']

export function DevTools() {
  const { sim, setSim, advanceDay, simulateWeek, resetWeek } = useLeague()

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-surface/90 backdrop-blur">
      <div className="mx-auto max-w-3xl px-4 py-2 flex items-center gap-2 flex-wrap">
        <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold shrink-0">DEV</span>
        <span className="text-xs text-muted-foreground">W{sim.currentWeek} · {sim.day}</span>
        <Button size="sm" variant="outline" className="h-7 text-xs" onClick={advanceDay}>
          +Day
        </Button>
        <Button size="sm" variant="outline" className="h-7 text-xs" onClick={simulateWeek}>
          Sim week
        </Button>
        <Button size="sm" variant="outline" className="h-7 text-xs" onClick={resetWeek}>
          Reset
        </Button>
        <div className="flex gap-1 ml-auto">
          {DAYS.map((d) => (
            <button
              key={d}
              onClick={() => setSim({ day: d })}
              className={`px-2 py-0.5 rounded text-[10px] font-bold ${sim.day === d ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'}`}
            >
              {d}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
