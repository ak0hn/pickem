'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { Shell } from '@/components/app/Shell'
import { TeamBadge } from '@/components/app/TeamBadge'
import { Button } from '@/components/ui/button'
import { useLeague, TEAMS, GMS, scoreEntry } from '@/lib/league/store'
import { cn } from '@/lib/utils'
import { Trophy, Lock } from 'lucide-react'
import type { GMEntry } from '@/lib/league/types'

const SLOT_LABEL: Record<string, string> = {
  TNF: 'Thu Night', SUN_EARLY: 'Sun 1pm', SUN_LATE: 'Sun 4pm', SNF: 'Sun Night', MNF: 'Mon Night',
}

export default function StandingsPage() {
  const { entries, games, sim } = useLeague()
  const [tab, setTab] = useState<'overall' | 'week'>('overall')
  const weeksAvailable = Array.from({ length: sim.currentWeek }, (_, i) => i + 1)
  const [viewWeek, setViewWeek] = useState(sim.currentWeek)

  const rows = useMemo(() => {
    return GMS.map((gm) => {
      const gmEntries = entries.filter((e) => e.gmId === gm.id && e.week < sim.currentWeek)
      let wins = 0, losses = 0, pushes = 0
      gmEntries.forEach((e) => {
        const s = scoreEntry(e, games)
        wins += s.wins; losses += s.losses; pushes += s.pushes
      })
      return { gm, wins, losses, pushes }
    }).sort((a, b) => (b.wins - b.losses) - (a.wins - a.losses))
  }, [entries, games, sim.currentWeek])

  const weeksPlayed = sim.currentWeek - 1

  return (
    <Shell>
      <div className="mb-4">
        <div className="text-[10px] uppercase tracking-widest text-primary font-bold">Cover League</div>
        <h1 className="font-display text-2xl">Standings</h1>
      </div>

      <div className="flex gap-1 mb-4 p-1 bg-surface rounded-lg w-fit">
        <button
          onClick={() => setTab('overall')}
          className={cn('px-3 py-1.5 rounded-md text-xs font-bold', tab === 'overall' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground')}
        >
          Overall
        </button>
        <button
          onClick={() => setTab('week')}
          className={cn('px-3 py-1.5 rounded-md text-xs font-bold', tab === 'week' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground')}
        >
          By week
        </button>
      </div>

      {tab === 'overall' ? (
        <>
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold mb-1.5">Through Week {weeksPlayed}</div>
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <div className="grid grid-cols-[2.5rem_1fr_4rem_4rem] px-4 py-2 bg-surface text-[10px] uppercase tracking-widest text-muted-foreground font-bold">
              <span>#</span><span>GM</span><span className="text-right">REC</span><span className="text-right">+/-</span>
            </div>
            {rows.map((r, i) => {
              const diff = r.wins - r.losses
              return (
                <div key={r.gm.id} className={cn(
                  'grid grid-cols-[2.5rem_1fr_4rem_4rem] px-4 py-3 items-center border-t border-border',
                  r.gm.isYou && 'bg-primary/5',
                )}>
                  <span className={cn('font-mono font-bold', i === 0 ? 'text-primary' : 'text-muted-foreground')}>
                    {i === 0 ? <Trophy className="size-4 text-primary inline" /> : i + 1}
                  </span>
                  <div className="flex items-center gap-2 min-w-0">
                    <div
                      className="size-7 rounded-full grid place-items-center text-[10px] font-bold text-background shrink-0"
                      style={{ backgroundColor: `oklch(0.75 0.16 ${r.gm.avatarHue})` }}
                    >
                      {r.gm.handle.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <div className="font-semibold text-sm truncate">@{r.gm.handle}</div>
                      <div className="flex gap-1 mt-0.5">
                        {r.gm.isYou && <span className="text-[9px] uppercase tracking-widest text-primary font-bold">you</span>}
                        {r.gm.isCommissioner && <span className="text-[9px] uppercase tracking-widest text-accent font-bold">commish</span>}
                      </div>
                    </div>
                  </div>
                  <span className="text-right font-mono font-bold tabular-nums">
                    {r.wins}-{r.losses}{r.pushes > 0 ? `-${r.pushes}` : ''}
                  </span>
                  <span className={cn('text-right font-mono font-bold tabular-nums', diff > 0 ? 'text-success' : diff < 0 ? 'text-destructive' : 'text-muted-foreground')}>
                    {diff > 0 ? `+${diff}` : diff}
                  </span>
                </div>
              )
            })}
          </div>
        </>
      ) : (
        <WeekView weeksAvailable={weeksAvailable} viewWeek={viewWeek} setViewWeek={setViewWeek} />
      )}
    </Shell>
  )
}

function WeekView({ weeksAvailable, viewWeek, setViewWeek }: {
  weeksAvailable: number[]; viewWeek: number; setViewWeek: (w: number) => void
}) {
  const { entries, games, sim, myEntry } = useLeague()
  const weekEntries = entries.filter((e) => e.week === viewWeek)
  const me = myEntry(viewWeek)
  const isCurrent = viewWeek === sim.currentWeek
  const someDecided = games.some((g) => g.week === viewWeek && g.finalAtsWinnerTeamId !== undefined)
  const revealed = !isCurrent || someDecided

  return (
    <div>
      <div className="flex gap-1 mb-4 overflow-x-auto pb-1">
        {weeksAvailable.map((w) => (
          <button
            key={w}
            onClick={() => setViewWeek(w)}
            className={cn(
              'px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap',
              w === viewWeek ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground hover:text-foreground',
            )}
          >
            W{w}
          </button>
        ))}
      </div>

      <div className="mb-5">
        <h2 className="font-display text-xs uppercase tracking-widest text-muted-foreground mb-2">YOUR CARD</h2>
        {!me ? (
          <div className="rounded-2xl border border-border bg-card p-5 text-center">
            <p className="text-sm text-muted-foreground">No picks in for Week {viewWeek}.</p>
            {isCurrent && (
              <Link href="/picks" className="mt-3 inline-block">
                <Button size="sm">Make picks now</Button>
              </Link>
            )}
          </div>
        ) : (
          <MyCard entry={me} />
        )}
      </div>

      <h2 className="font-display text-xs uppercase tracking-widest text-muted-foreground mb-2">
        LEAGUE · WEEK {viewWeek}
      </h2>
      {!revealed ? (
        <div className="rounded-xl border border-border bg-card p-5 text-center text-sm text-muted-foreground">
          <Lock className="size-4 mx-auto mb-2" />
          Everyone's picks reveal at kickoff.
        </div>
      ) : (
        <div className="space-y-2">
          {weekEntries.map((e) => {
            const gm = GMS.find((g) => g.id === e.gmId)!
            const s = scoreEntry(e, games)
            return (
              <div key={e.gmId} className="rounded-xl border border-border bg-card p-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div
                      className="size-7 rounded-full grid place-items-center text-[10px] font-bold text-background"
                      style={{ backgroundColor: `oklch(0.75 0.16 ${gm.avatarHue})` }}
                    >
                      {gm.handle.slice(0, 2).toUpperCase()}
                    </div>
                    <span className="font-semibold text-sm">@{gm.handle}</span>
                    {gm.isYou && <span className="text-[10px] uppercase tracking-widest text-primary font-bold">you</span>}
                  </div>
                  <div className="font-mono font-bold text-sm">
                    <span className="text-success">{s.wins}</span>
                    <span className="text-muted-foreground">-{s.losses}</span>
                  </div>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {e.picks.map((p) => {
                    const g = games.find((x) => x.id === p.gameId)!
                    const pickedId = p.side === 'HOME' ? g.homeTeamId : g.awayTeamId
                    const sp = p.side === 'HOME' ? g.spread : -g.spread
                    const decided = g.finalAtsWinnerTeamId !== undefined
                    const win = decided && g.finalAtsWinnerTeamId === pickedId
                    const push = decided && g.finalAtsWinnerTeamId === null
                    return (
                      <div key={p.gameId} className={cn(
                        'px-2 py-1 rounded text-[10px] font-bold tracking-wider',
                        !decided && 'bg-surface text-muted-foreground',
                        decided && win && 'bg-success/20 text-success',
                        decided && !win && !push && 'bg-destructive/20 text-destructive line-through',
                        push && 'bg-warning/20 text-warning',
                      )}>
                        {TEAMS[pickedId].abbr} {sp > 0 ? `+${sp}` : sp}
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function MyCard({ entry }: { entry: GMEntry }) {
  const { games, pickStatus } = useLeague()
  const s = scoreEntry(entry, games)
  return (
    <div className="rounded-2xl border border-border bg-card overflow-hidden">
      <div className="px-4 py-2 flex items-center justify-between bg-surface">
        <span className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground">Your 6 picks</span>
        <span className="font-mono font-bold text-sm">
          <span className="text-success">{s.wins}</span>
          <span className="text-muted-foreground">-{s.losses}</span>
          {s.pushes > 0 && <><span className="text-muted-foreground">-</span><span className="text-warning">{s.pushes}</span></>}
        </span>
      </div>
      <ol className="divide-y divide-border">
        {entry.picks.map((p) => {
          const { status, game } = pickStatus(p)
          if (!game) return null
          const pickedId = p.side === 'HOME' ? game.homeTeamId : game.awayTeamId
          const otherId = p.side === 'HOME' ? game.awayTeamId : game.homeTeamId
          const sp = p.side === 'HOME' ? game.spread : -game.spread
          return (
            <li key={p.gameId} className="px-3 py-2.5 flex items-center gap-3">
              <TeamBadge teamId={pickedId} size="sm" />
              <div className="flex-1 min-w-0">
                <div className="font-display text-sm leading-tight">
                  {TEAMS[pickedId].abbr} <span className="font-mono text-muted-foreground">{sp > 0 ? `+${sp}` : sp}</span>
                </div>
                <div className="text-[11px] text-muted-foreground">{p.side === 'HOME' ? 'vs' : '@'} {TEAMS[otherId].abbr} · {SLOT_LABEL[game.slot]}</div>
              </div>
              {status === 'pending' ? (
                <span className="text-[10px] uppercase tracking-widest text-muted-foreground">Live</span>
              ) : (
                <div className="text-right">
                  <div className="font-mono text-xs tabular-nums">{game.awayScore}–{game.homeScore}</div>
                  <div className={cn(
                    'text-[10px] font-bold uppercase tracking-widest',
                    status === 'win' ? 'text-success' : status === 'push' ? 'text-warning' : 'text-destructive',
                  )}>
                    {status === 'win' ? 'Cover' : status === 'push' ? 'Push' : 'No cover'}
                  </div>
                </div>
              )}
            </li>
          )
        })}
      </ol>
    </div>
  )
}
