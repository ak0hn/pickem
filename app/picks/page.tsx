'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { Shell } from '@/components/app/Shell'
import { TeamBadge } from '@/components/app/TeamBadge'
import { Button } from '@/components/ui/button'
import { useLeague, TEAMS } from '@/lib/league/store'
import type { Pick, PickSide } from '@/lib/league/types'
import { cn } from '@/lib/utils'
import { Lock, CheckCircle2, Clock } from 'lucide-react'

const SLOT_LABEL: Record<string, string> = {
  TNF: 'Thu Night',
  SUN_EARLY: 'Sun 1pm',
  SUN_LATE: 'Sun 4pm',
  SNF: 'Sun Night',
  MNF: 'Mon Night',
}

function fmtSpread(n: number) {
  return n > 0 ? `+${n}` : `${n}`
}

export default function PicksPage() {
  const { games, sim, submitMyPicks, myEntry, isSlatePublished, weekLocked } = useLeague()
  const week = sim.currentWeek
  const wkGames = useMemo(() => games.filter((g) => g.week === week), [games, week])
  const existing = myEntry(week)
  const locked = weekLocked
  const slateLive = isSlatePublished(week)

  const [picks, setPicks] = useState<Record<string, PickSide | undefined>>(() => {
    const init: Record<string, PickSide> = {}
    existing?.picks.forEach((p) => { init[p.gameId] = p.side })
    return init
  })
  const [submitted, setSubmitted] = useState(!!existing)

  const count = Object.values(picks).filter(Boolean).length
  const valid = count === 6

  function toggle(gameId: string, side: PickSide) {
    if (locked || submitted) return
    setPicks((prev) => {
      const cur = prev[gameId]
      if (cur === side) {
        const { [gameId]: _, ...rest } = prev
        return rest
      }
      if (!cur && count >= 6) return prev
      return { ...prev, [gameId]: side }
    })
  }

  function submit() {
    const list: Pick[] = Object.entries(picks)
      .filter(([, s]) => !!s)
      .map(([gameId, side]) => ({ gameId, side: side as PickSide }))
    submitMyPicks(week, list)
    setSubmitted(true)
  }

  if (!slateLive) {
    return (
      <Shell>
        <div className="rounded-2xl border border-border bg-card p-6 text-center">
          <Clock className="size-6 text-accent mx-auto" />
          <h2 className="mt-3 font-display text-xl">Slate hasn't dropped yet</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            The commissioner hasn't published Week {week}. As commish, you can drop it from the feed.
          </p>
          <Link href="/" className="mt-4 inline-block">
            <Button>Back to feed</Button>
          </Link>
        </div>
      </Shell>
    )
  }

  if (locked && !existing) {
    return (
      <Shell>
        <div className="rounded-2xl border border-border bg-card p-6 text-center">
          <Lock className="size-6 text-muted-foreground mx-auto" />
          <h2 className="mt-3 font-display text-xl">Slate is locked</h2>
          <p className="mt-1 text-sm text-muted-foreground">Week {week} kicked off. You didn't get picks in.</p>
          <Link href="/standings" className="mt-4 inline-block">
            <Button variant="secondary">See standings</Button>
          </Link>
        </div>
      </Shell>
    )
  }

  return (
    <Shell>
      <div className="flex items-end justify-between mb-4">
        <div>
          <div className="text-[10px] uppercase tracking-widest text-primary font-bold">Week {week} board</div>
          <h1 className="font-display text-2xl">Pick 6 of {wkGames.length}</h1>
        </div>
        <div className="text-right">
          <div className="font-mono text-2xl font-bold text-foreground">{count}<span className="text-muted-foreground">/6</span></div>
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground">selected</div>
        </div>
      </div>

      {submitted && (
        <div className="mb-4 rounded-xl border border-primary/40 bg-primary/10 p-3 flex items-center gap-2 text-sm">
          <CheckCircle2 className="size-4 text-primary" />
          <span>Picks locked in. They're hidden from the league until kickoff.</span>
        </div>
      )}

      <ol className="space-y-3">
        {wkGames.map((g) => {
          const home = TEAMS[g.homeTeamId]
          const away = TEAMS[g.awayTeamId]
          const homeSpread = g.spread
          const awaySpread = -g.spread
          const sel = picks[g.id]
          return (
            <li key={g.id} className="rounded-xl border border-border bg-card overflow-hidden">
              <div className="px-4 py-2 bg-surface flex items-center justify-between text-[10px] uppercase tracking-widest text-muted-foreground">
                <span>{SLOT_LABEL[g.slot]}</span>
                <span className="font-mono normal-case tracking-normal">
                  {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][new Date(g.kickoff).getUTCDay()]}{' '}
                  {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][new Date(g.kickoff).getUTCMonth()]}{' '}
                  {new Date(g.kickoff).getUTCDate()}
                </span>
              </div>
              <div className="grid grid-cols-2 divide-x divide-border">
                <SideButton
                  team={away.abbr} city={away.city} name={away.name}
                  teamId={away.id} spread={awaySpread}
                  selected={sel === 'AWAY'}
                  disabled={(locked || submitted) || (!sel && count >= 6 && sel !== 'AWAY')}
                  onClick={() => toggle(g.id, 'AWAY')}
                />
                <SideButton
                  team={home.abbr} city={home.city} name={home.name}
                  teamId={home.id} spread={homeSpread}
                  selected={sel === 'HOME'}
                  disabled={(locked || submitted) || (!sel && count >= 6 && sel !== 'HOME')}
                  onClick={() => toggle(g.id, 'HOME')}
                />
              </div>
            </li>
          )
        })}
      </ol>

      {!submitted && (
        <div className="sticky bottom-4 mt-6">
          <Button
            onClick={submit}
            disabled={!valid || locked}
            size="lg"
            className="w-full h-14 text-base font-display tracking-wider shadow-2xl"
          >
            {valid ? 'LOCK IN 6 PICKS' : `PICK ${6 - count} MORE`}
          </Button>
        </div>
      )}
    </Shell>
  )
}

function SideButton({
  city, name, teamId, spread, selected, disabled, onClick,
}: {
  team: string; city: string; name: string; teamId: string; spread: number
  selected: boolean; disabled: boolean; onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'p-4 text-left transition-all flex items-center gap-3 relative',
        selected ? 'bg-primary/15 ring-2 ring-primary ring-inset' : 'hover:bg-surface',
        disabled && !selected && 'opacity-40 cursor-not-allowed',
      )}
    >
      <TeamBadge teamId={teamId} />
      <div className="min-w-0 flex-1">
        <div className="text-[10px] uppercase tracking-widest text-muted-foreground truncate">{city}</div>
        <div className="font-display text-sm leading-tight">{name}</div>
      </div>
      <div className={cn('font-mono text-base font-bold tabular-nums', selected ? 'text-primary' : 'text-foreground')}>
        {fmtSpread(spread)}
      </div>
    </button>
  )
}
