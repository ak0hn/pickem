'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { DevTools } from './DevTools'
import { PicksTicker } from './PicksTicker'
import { useLeague } from '@/lib/league/store'

const NAV = [
  { to: '/', label: 'Feed' },
  { to: '/picks', label: 'Picks' },
  { to: '/standings', label: 'Standings' },
  { to: '/commissioner', label: 'Commish' },
]

export function Shell({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const { sim } = useLeague()

  return (
    <div className="min-h-screen bg-background text-foreground pb-24">
      <header className="sticky top-0 z-30 border-b border-border bg-background/85 backdrop-blur">
        <div className="mx-auto max-w-3xl px-4 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <span className="size-7 rounded-md bg-primary text-primary-foreground grid place-items-center font-display text-sm">CL</span>
            <span className="font-display text-base tracking-wide">COVER LEAGUE</span>
          </Link>
          <div className="flex items-center gap-2 text-xs">
            <span className="rounded-full bg-surface px-2 py-1 text-muted-foreground">Week {sim.currentWeek}</span>
            <span className="rounded-full bg-surface px-2 py-1 text-muted-foreground">{sim.day}</span>
          </div>
        </div>
        <nav className="mx-auto max-w-3xl px-2 flex gap-1 overflow-x-auto">
          {NAV.map((n) => {
            const active = n.to === '/' ? pathname === '/' : pathname.startsWith(n.to)
            return (
              <Link
                key={n.to}
                href={n.to}
                className={cn(
                  'px-3 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors',
                  active
                    ? 'border-primary text-foreground'
                    : 'border-transparent text-muted-foreground hover:text-foreground',
                )}
              >
                {n.label}
              </Link>
            )
          })}
        </nav>
        <PicksTicker />
      </header>
      <main className="mx-auto max-w-3xl px-4 py-6">{children}</main>
      <DevTools />
    </div>
  )
}
