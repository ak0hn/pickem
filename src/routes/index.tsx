import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { Shell } from "@/components/app/Shell";
import { useLeague, fmtDateTime, GMS, YOU_ID } from "@/lib/league/store";
import { Megaphone, Trophy, ListChecks, Sparkles, Bell, Settings2, AlertCircle, Heart, MessageCircle, Send } from "lucide-react";
import type { FeedItem, FeedItemKind } from "@/lib/league/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({
  head: () => ({ meta: [{ title: "Feed — Cover League" }] }),
  component: FeedPage,
});

const ICONS: Record<FeedItemKind, typeof Megaphone> = {
  SLATE_PUBLISHED: ListChecks,
  RESULTS: Trophy,
  STANDINGS_UPDATE: Sparkles,
  ANNOUNCEMENT: Megaphone,
  TIEBREAKER_CALL: Bell,
};

const KIND_LABEL: Record<FeedItemKind, string> = {
  SLATE_PUBLISHED: "SLATE",
  RESULTS: "RESULTS",
  STANDINGS_UPDATE: "STANDINGS",
  ANNOUNCEMENT: "COMMISH",
  TIEBREAKER_CALL: "TIEBREAKER",
};

function FeedPage() {
  const { feed, sim, myEntry, getSlateStatus } = useLeague();
  const sorted = [...feed].sort((a, b) => +new Date(b.postedAt) - +new Date(a.postedAt));
  const myW = myEntry(sim.currentWeek);
  const status = getSlateStatus(sim.currentWeek);
  const slateLive = status === "PUBLISHED";

  return (
    <Shell>
      {!slateLive && (
        <Link to="/commish" className="block mb-6">
          <div className="rounded-2xl border border-accent/50 bg-gradient-to-br from-accent/15 via-surface to-surface p-5 hover:border-accent transition-colors">
            <div className="flex items-center gap-2 text-[10px] uppercase tracking-widest font-bold">
              <span className="rounded bg-accent text-accent-foreground px-1.5 py-0.5">COMMISH</span>
              <span className="text-muted-foreground">Action required</span>
              <AlertCircle className="size-3.5 text-accent ml-auto" />
            </div>
            <h2 className="mt-2 text-xl font-display leading-tight">
              {status === "DRAFT" ? `Week ${sim.currentWeek} slate hasn't been pulled yet` : `Week ${sim.currentWeek} is in review — publish to open the board`}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {status === "DRAFT"
                ? "Pull the lines, review the spreads, then publish to the league."
                : "Lines are pulled. Tweak any spreads, then publish with a message."}
            </p>
            <span className="mt-3 inline-flex items-center gap-1.5 text-primary text-sm font-semibold">
              <Settings2 className="size-3.5" />
              Open Commish HQ →
            </span>
          </div>
        </Link>
      )}

      {slateLive && !myW && (
        <div className="mb-6 rounded-2xl border border-primary/40 bg-gradient-to-br from-primary/15 via-surface to-surface p-5">
          <div className="text-[10px] uppercase tracking-widest text-primary font-bold">GM mode · Action required</div>
          <h2 className="mt-1 text-xl font-display">You haven't made Week {sim.currentWeek} picks</h2>
          <p className="mt-1 text-sm text-muted-foreground">Pick 6 of 14. Lock before Friday.</p>
          <Link to="/picks" className="mt-3 inline-block">
            <Button size="lg" className="font-display tracking-wide">Open the board →</Button>
          </Link>
        </div>
      )}

      <h1 className="font-display text-xl mb-3 text-muted-foreground">THE WIRE</h1>
      <ol className="space-y-3">
        {sorted.length === 0 && (
          <li className="rounded-xl border border-dashed border-border bg-card/40 p-6 text-center text-sm text-muted-foreground">
            Quiet on the wire.
          </li>
        )}
        {sorted.map((item) => <FeedCard key={item.id} item={item} />)}
      </ol>
    </Shell>
  );
}

function FeedCard({ item }: { item: FeedItem }) {
  const { toggleLike, addComment } = useLeague();
  const [draft, setDraft] = useState("");
  const [showComments, setShowComments] = useState(false);

  const Icon = ICONS[item.kind];
  const likes = item.likes ?? [];
  const comments = item.comments ?? [];
  const youLiked = likes.includes(YOU_ID);

  function submit(e: FormEvent) {
    e.preventDefault();
    if (!draft.trim()) return;
    addComment(item.id, draft);
    setDraft("");
    setShowComments(true);
  }

  return (
    <li className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
        <Icon className="size-3.5 text-primary" />
        <span className="text-primary">{KIND_LABEL[item.kind]}</span>
        <span>·</span>
        <span>Week {item.week}</span>
        <span className="ml-auto font-mono normal-case tracking-normal text-muted-foreground">{fmtDateTime(item.postedAt)}</span>
      </div>
      <h3 className="mt-2 font-display text-lg leading-tight">{item.title}</h3>
      {item.body && <p className="mt-1 text-sm text-muted-foreground whitespace-pre-wrap">{item.body}</p>}

      <div className="mt-3 flex flex-wrap gap-2">
        {item.ctaWeek !== undefined && (
          <Link to="/picks">
            <Button variant="default" size="sm" className="font-semibold">Make Week {item.ctaWeek} picks →</Button>
          </Link>
        )}
        {(item.kind === "RESULTS" || item.kind === "STANDINGS_UPDATE") && (
          <Link to="/standings">
            <Button variant="secondary" size="sm">View standings →</Button>
          </Link>
        )}
      </div>

      <div className="mt-3 pt-3 border-t border-border flex items-center gap-1">
        <button
          onClick={() => toggleLike(item.id)}
          className={cn(
            "flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-bold transition-colors",
            youLiked ? "text-destructive" : "text-muted-foreground hover:text-foreground",
          )}
        >
          <Heart className={cn("size-3.5", youLiked && "fill-current")} />
          <span className="font-mono tabular-nums">{likes.length || ""}</span>
        </button>
        <button
          onClick={() => setShowComments((v) => !v)}
          className="flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-bold text-muted-foreground hover:text-foreground"
        >
          <MessageCircle className="size-3.5" />
          <span className="font-mono tabular-nums">{comments.length || ""}</span>
          <span className="hidden sm:inline">{comments.length === 1 ? "comment" : "comments"}</span>
        </button>
      </div>

      {(showComments || comments.length > 0) && (
        <div className="mt-2 space-y-2">
          {comments.map((c) => {
            const gm = GMS.find((g) => g.id === c.gmId);
            return (
              <div key={c.id} className="flex gap-2 text-sm">
                <div className="size-6 rounded-full grid place-items-center text-[9px] font-bold text-background shrink-0" style={{ backgroundColor: `oklch(0.75 0.16 ${gm?.avatarHue ?? 200})` }}>
                  {(gm?.handle ?? "??").slice(0, 2).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0 rounded-lg bg-surface px-3 py-1.5">
                  <div className="text-[11px] font-bold text-foreground">@{gm?.handle ?? c.gmId}</div>
                  <div className="text-sm text-muted-foreground whitespace-pre-wrap break-words">{c.body}</div>
                </div>
              </div>
            );
          })}
          <form onSubmit={submit} className="flex gap-2">
            <Input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Add a comment..."
              className="bg-background h-9 text-sm"
            />
            <Button type="submit" size="sm" disabled={!draft.trim()} className="h-9 px-3">
              <Send className="size-3.5" />
            </Button>
          </form>
        </div>
      )}
    </li>
  );
}
