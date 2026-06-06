import { useState } from "react";
import { Wrench, ChevronUp, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLeague } from "@/lib/league/store";
import type { DayOfWeek } from "@/lib/league/types";
import { cn } from "@/lib/utils";

const DAYS: DayOfWeek[] = ["Tue", "Wed", "Thu", "Fri", "Sat", "Sun", "Mon"];

export function DevTools() {
  const [open, setOpen] = useState(false);
  const { sim, setSim, advanceDay, simulateWeek, resetWeek } = useLeague();

  return (
    <div className="fixed bottom-4 right-4 z-50 font-mono">
      <div className={cn(
        "rounded-xl border border-border bg-surface-elevated shadow-2xl text-xs overflow-hidden transition-all",
        open ? "w-80" : "w-auto",
      )}>
        <button
          onClick={() => setOpen((v) => !v)}
          className="w-full flex items-center justify-between gap-2 px-3 py-2 bg-background/40 hover:bg-background/70"
        >
          <span className="flex items-center gap-2">
            <Wrench className="size-3.5 text-primary" />
            <span className="uppercase tracking-widest text-[10px] text-muted-foreground">Dev / Sim</span>
            <span className="text-foreground">W{sim.currentWeek} · {sim.day}</span>
          </span>
          {open ? <ChevronDown className="size-3.5" /> : <ChevronUp className="size-3.5" />}
        </button>
        {open && (
          <div className="p-3 space-y-3">
            <div>
              <div className="text-muted-foreground mb-1.5">Day of week</div>
              <div className="grid grid-cols-7 gap-1">
                {DAYS.map((d) => (
                  <button
                    key={d}
                    onClick={() => setSim({ day: d })}
                    className={cn(
                      "py-1.5 rounded text-[10px] font-bold",
                      sim.day === d ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <div className="text-muted-foreground mb-1.5">Week</div>
              <div className="flex items-center gap-2">
                <Button size="sm" variant="secondary" className="h-7 px-2" onClick={() => setSim({ currentWeek: Math.max(1, sim.currentWeek - 1) })}>-</Button>
                <span className="flex-1 text-center text-foreground">Week {sim.currentWeek}</span>
                <Button size="sm" variant="secondary" className="h-7 px-2" onClick={() => setSim({ currentWeek: Math.min(18, sim.currentWeek + 1) })}>+</Button>
              </div>
            </div>
            <div className="space-y-1.5">
              <Button size="sm" className="w-full h-7" onClick={advanceDay}>Advance 1 day</Button>
              <Button size="sm" variant="secondary" className="w-full h-7" onClick={simulateWeek}>Sim entire week →</Button>
              <Button size="sm" variant="outline" className="w-full h-7" onClick={resetWeek}>Reset to Week 8 / Tue</Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
