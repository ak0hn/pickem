'use client'

import { useLeague } from '@/lib/league/store'

export function DevTools() {
  const { sim, activeWeek, refresh } = useLeague()

  if (process.env.NODE_ENV !== 'development') return null

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-surface/90 backdrop-blur">
      <div className="mx-auto max-w-3xl px-4 py-2 flex items-center gap-3 flex-wrap">
        <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold shrink-0">DEV</span>
        <span className="text-xs text-muted-foreground">
          W{sim.currentWeek} · {sim.day} · {activeWeek?.status ?? 'no week'}
        </span>
        <button
          onClick={refresh}
          className="ml-auto text-[10px] uppercase tracking-widest text-muted-foreground hover:text-foreground font-bold"
        >
          Refresh
        </button>
      </div>
    </div>
  )
}
