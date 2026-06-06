import { TEAMS } from "@/lib/league/store";
import { cn } from "@/lib/utils";

export function TeamBadge({ teamId, size = "md" }: { teamId: string; size?: "sm" | "md" | "lg" }) {
  const t = TEAMS[teamId];
  if (!t) return null;
  const sz = size === "lg" ? "size-12 text-base" : size === "sm" ? "size-7 text-[10px]" : "size-9 text-xs";
  return (
    <div
      className={cn("rounded-md grid place-items-center font-display text-white shrink-0", sz)}
      style={{ backgroundColor: t.color }}
    >
      {t.abbr}
    </div>
  );
}
