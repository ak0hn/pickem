import { Link, useRouterState } from "@tanstack/react-router";
import { useLeague, TEAMS, picksLockedForWeek, type PickStatus } from "@/lib/league/store";
import { cn } from "@/lib/utils";
import { CheckCircle2, XCircle, MinusCircle, Clock, AlertTriangle, ChevronRight } from "lucide-react";

function fmtSpread(n: number) {
  return n > 0 ? `+${n}` : `${n}`;
}

const STATUS_STYLE: Record<PickStatus, string> = {
  pending: "border-border bg-surface text-foreground",
  win: "border-success/60 bg-success/15 text-success",
  loss: "border-destructive/50 bg-destructive/15 text-destructive",
  push: "border-warning/50 bg-warning/15 text-warning",
};

function StatusIcon({ status }: { status: PickStatus }) {
  if (status === "win") return <CheckCircle2 className="size-3" />;
  if (status === "loss") return <XCircle className="size-3" />;
  if (status === "push") return <MinusCircle className="size-3" />;
  return <Clock className="size-3 opacity-60" />;
}

export function PicksTicker() {
  const { sim, myEntry, isSlatePublished, pickStatus } = useLeague();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  // Hide on the picks page itself to avoid redundancy
  if (pathname === "/picks") return null;

  const week = sim.currentWeek;
  const slateLive = isSlatePublished(week);
  const entry = myEntry(week);

  // Empty state — nudge to pick. Highest priority CTA.
  if (slateLive && !entry) {
    const locked = picksLockedForWeek(sim.day);
    return (
      <Link
        to="/picks"
        className={cn(
          "block border-b",
          locked ? "border-destructive/40 bg-destructive/10" : "border-accent/40 bg-accent/10",
        )}
      >
        <div className="mx-auto max-w-3xl px-4 py-2 flex items-center gap-2">
          <AlertTriangle className={cn("size-4 shrink-0", locked ? "text-destructive" : "text-accent")} />
          <div className="flex-1 min-w-0">
            <div className="text-[10px] uppercase tracking-widest font-bold">
              {locked ? "PICKS MISSED" : "ACTION NEEDED"}
            </div>
            <div className="text-xs text-muted-foreground truncate">
              {locked ? `You didn't lock Week ${week}` : `Lock your Week ${week} picks before kickoff`}
            </div>
          </div>
          <ChevronRight className="size-4 text-muted-foreground" />
        </div>
      </Link>
    );
  }

  if (!slateLive || !entry) return null;

  return (
    <Link
      to="/picks"
      className="block border-b border-border bg-background/85 backdrop-blur"
    >
      <div className="mx-auto max-w-3xl px-3 py-2">
        <div className="flex items-center gap-2 mb-1.5">
          <span className="text-[10px] uppercase tracking-widest font-bold text-primary">My W{week} card</span>
          <RecordBadge />
          <ChevronRight className="size-3 text-muted-foreground ml-auto" />
        </div>
        <div className="flex gap-1.5 overflow-x-auto -mx-1 px-1 scrollbar-none">
          {entry.picks.map((p) => {
            const { status, game } = pickStatus(p);
            if (!game) return null;
            const pickedId = p.side === "HOME" ? game.homeTeamId : game.awayTeamId;
            const spread = p.side === "HOME" ? game.spread : -game.spread;
            const team = TEAMS[pickedId];
            return (
              <div
                key={p.gameId}
                className={cn(
                  "shrink-0 rounded-md border px-2 py-1 flex items-center gap-1.5 text-xs font-bold",
                  STATUS_STYLE[status],
                )}
              >
                <span
                  className="size-4 rounded-sm grid place-items-center text-[8px] text-white font-display"
                  style={{ backgroundColor: team.color }}
                >
                  {team.abbr.slice(0, 1)}
                </span>
                <span className="font-mono">{team.abbr}</span>
                <span className="font-mono tabular-nums opacity-80">{fmtSpread(spread)}</span>
                <StatusIcon status={status} />
              </div>
            );
          })}
        </div>
      </div>
    </Link>
  );
}

function RecordBadge() {
  const { sim, myEntry, pickStatus } = useLeague();
  const entry = myEntry(sim.currentWeek);
  if (!entry) return null;
  let w = 0, l = 0, p = 0, pend = 0;
  for (const pk of entry.picks) {
    const s = pickStatus(pk).status;
    if (s === "win") w++;
    else if (s === "loss") l++;
    else if (s === "push") p++;
    else pend++;
  }
  return (
    <span className="font-mono text-[11px] font-bold tabular-nums">
      <span className="text-success">{w}</span>
      <span className="text-muted-foreground">-</span>
      <span className="text-destructive">{l}</span>
      {p > 0 && <><span className="text-muted-foreground">-</span><span className="text-warning">{p}</span></>}
      {pend > 0 && <span className="text-muted-foreground"> · {pend} live</span>}
    </span>
  );
}
