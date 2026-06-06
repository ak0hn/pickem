import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Shell } from "@/components/app/Shell";
import { TeamBadge } from "@/components/app/TeamBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useLeague, TEAMS, fmtDateTime } from "@/lib/league/store";
import { cn } from "@/lib/utils";
import {
  Download, Rocket, Megaphone, Pencil, Check, X, CircleDot,
  CheckCircle2, AlertCircle, RotateCcw, Loader2,
} from "lucide-react";

export const Route = createFileRoute("/commish")({
  head: () => ({ meta: [{ title: "Commish HQ — Cover League" }] }),
  component: CommishPage,
});

const SLOT_LABEL: Record<string, string> = {
  TNF: "Thu Night",
  SUN_EARLY: "Sun 1pm",
  SUN_LATE: "Sun 4pm",
  SNF: "Sun Night",
  MNF: "Mon Night",
};

function CommishPage() {
  const { sim, games, getSlateStatus, feed } = useLeague();
  const week = sim.currentWeek;
  const status = getSlateStatus(week);
  const wkGames = useMemo(() => games.filter((g) => g.week === week), [games, week]);

  const recentCommishPosts = feed
    .filter((f) => f.kind === "SLATE_PUBLISHED" || f.kind === "ANNOUNCEMENT" || f.kind === "TIEBREAKER_CALL")
    .sort((a, b) => +new Date(b.postedAt) - +new Date(a.postedAt))
    .slice(0, 4);

  return (
    <Shell>
      <div className="mb-6">
        <div className="flex items-center gap-2 text-[10px] uppercase tracking-widest font-bold mb-1">
          <span className="rounded bg-accent text-accent-foreground px-1.5 py-0.5">COMMISH</span>
          <span className="text-muted-foreground">Cover League · Week {week}</span>
        </div>
        <h1 className="font-display text-3xl">Commish HQ</h1>
        <p className="text-sm text-muted-foreground mt-1">Run the league. Anything you publish drops onto the feed.</p>
      </div>

      <SlateWorkflow week={week} status={status} games={wkGames} />

      <AnnouncementBox />

      <section className="mt-8">
        <h2 className="font-display text-lg mb-3 text-muted-foreground">YOUR RECENT POSTS</h2>
        {recentCommishPosts.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-card/40 p-6 text-center text-sm text-muted-foreground">
            Nothing published yet.
          </div>
        ) : (
          <ol className="space-y-2">
            {recentCommishPosts.map((p) => (
              <li key={p.id} className="rounded-xl border border-border bg-card p-3">
                <div className="flex items-center gap-2 text-[10px] uppercase tracking-widest text-muted-foreground font-bold">
                  <span className="text-primary">{p.kind === "SLATE_PUBLISHED" ? "SLATE" : p.kind === "TIEBREAKER_CALL" ? "TIEBREAKER" : "ANNOUNCEMENT"}</span>
                  <span>·</span>
                  <span>Week {p.week}</span>
                  <span className="ml-auto font-mono normal-case tracking-normal">{fmtDateTime(p.postedAt)}</span>
                </div>
                <div className="font-display text-sm mt-1">{p.title}</div>
                {p.body && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2 whitespace-pre-wrap">{p.body}</p>}
              </li>
            ))}
          </ol>
        )}
      </section>
    </Shell>
  );
}

/* ---------- Slate workflow ---------- */

function SlateWorkflow({
  week, status, games,
}: { week: number; status: "DRAFT" | "REVIEW" | "PUBLISHED"; games: ReturnType<typeof useLeague>["games"] }) {
  const { pullLines, publishSlate } = useLeague();
  const [pulling, setPulling] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [message, setMessage] = useState("");

  function handlePull() {
    setPulling(true);
    setTimeout(() => { pullLines(week); setPulling(false); }, 600);
  }
  function handlePublish() {
    setPublishing(true);
    setTimeout(() => { publishSlate(week, message); setPublishing(false); setMessage(""); }, 350);
  }

  return (
    <section className="rounded-2xl border border-border bg-card overflow-hidden mb-8">
      <div className="px-5 py-4 border-b border-border bg-surface">
        <div className="flex items-center gap-3">
          <h2 className="font-display text-lg">Week {week} slate</h2>
          <StatusPill status={status} />
        </div>
        <StepIndicator status={status} />
      </div>

      <div className="p-5">
        {status === "DRAFT" && (
          <div className="text-center py-6">
            <Download className="size-7 text-accent mx-auto" />
            <h3 className="mt-3 font-display text-xl">Pull this week's lines</h3>
            <p className="mt-1 text-sm text-muted-foreground max-w-md mx-auto">
              Grab the latest spreads from the sportsbook. You'll get a chance to review and edit before publishing.
            </p>
            <Button onClick={handlePull} disabled={pulling} size="lg" className="mt-4">
              {pulling ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />}
              {pulling ? "Pulling lines..." : "Pull lines"}
            </Button>
          </div>
        )}

        {status === "REVIEW" && (
          <>
            <div className="flex items-start gap-2 rounded-lg bg-warning/10 border border-warning/30 p-3 mb-4">
              <AlertCircle className="size-4 text-warning mt-0.5 shrink-0" />
              <div className="text-sm">
                <div className="font-semibold">Review mode — not yet visible to the league.</div>
                <div className="text-muted-foreground text-xs mt-0.5">Tap any spread to edit. Publish when you're ready.</div>
              </div>
            </div>
            <ol className="space-y-2 mb-5">
              {games.map((g) => <EditableGameRow key={g.id} game={g} />)}
            </ol>
            <div className="space-y-2">
              <label className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">
                Message to the league (optional)
              </label>
              <Textarea
                placeholder="e.g. Lines are wild this week. Texans -7 looks juicy. Lock 'em before Friday."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="bg-background min-h-20"
              />
              <Button onClick={handlePublish} disabled={publishing} size="lg" className="w-full font-display tracking-wide">
                {publishing ? <Loader2 className="size-4 animate-spin" /> : <Rocket className="size-4" />}
                {publishing ? "Publishing..." : `Publish Week ${week} slate to the league`}
              </Button>
            </div>
          </>
        )}

        {status === "PUBLISHED" && (
          <>
            <div className="flex items-center gap-2 rounded-lg bg-primary/10 border border-primary/30 p-3 mb-4">
              <CheckCircle2 className="size-4 text-primary shrink-0" />
              <div className="text-sm">
                <div className="font-semibold">Slate is live. The league can pick.</div>
                <div className="text-muted-foreground text-xs mt-0.5">Don't forget to make your own picks — you're a GM too.</div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 mb-4">
              {games.map((g) => (
                <div key={g.id} className="rounded-lg border border-border bg-surface px-3 py-2 flex items-center justify-between text-sm">
                  <span className="font-semibold">{TEAMS[g.awayTeamId].abbr} @ {TEAMS[g.homeTeamId].abbr}</span>
                  <span className="font-mono tabular-nums text-muted-foreground">{g.spread > 0 ? `+${g.spread}` : g.spread}</span>
                </div>
              ))}
            </div>
            <Link to="/picks">
              <Button variant="secondary" className="w-full">Go make your picks →</Button>
            </Link>
          </>
        )}
      </div>
    </section>
  );
}

function StatusPill({ status }: { status: "DRAFT" | "REVIEW" | "PUBLISHED" }) {
  const map = {
    DRAFT:     { label: "Not pulled", cls: "bg-muted text-muted-foreground" },
    REVIEW:    { label: "In review",  cls: "bg-warning/20 text-warning border border-warning/40" },
    PUBLISHED: { label: "Live",       cls: "bg-primary/20 text-primary border border-primary/40" },
  };
  const m = map[status];
  return <span className={cn("text-[10px] uppercase tracking-widest font-bold px-2 py-0.5 rounded", m.cls)}>{m.label}</span>;
}

function StepIndicator({ status }: { status: "DRAFT" | "REVIEW" | "PUBLISHED" }) {
  const steps: { key: "DRAFT" | "REVIEW" | "PUBLISHED"; label: string }[] = [
    { key: "DRAFT", label: "Pull lines" },
    { key: "REVIEW", label: "Review & edit" },
    { key: "PUBLISHED", label: "Publish" },
  ];
  const idx = steps.findIndex((s) => s.key === status);
  return (
    <div className="flex items-center gap-2 mt-3">
      {steps.map((s, i) => {
        const done = i < idx;
        const current = i === idx;
        return (
          <div key={s.key} className="flex items-center gap-2 flex-1">
            <div className={cn(
              "size-5 rounded-full grid place-items-center text-[10px] font-bold",
              done ? "bg-primary text-primary-foreground" : current ? "bg-accent text-accent-foreground" : "bg-secondary text-muted-foreground",
            )}>
              {done ? <Check className="size-3" /> : i + 1}
            </div>
            <span className={cn("text-[11px] uppercase tracking-widest font-bold", current ? "text-foreground" : "text-muted-foreground")}>
              {s.label}
            </span>
            {i < steps.length - 1 && <div className={cn("flex-1 h-px", done ? "bg-primary" : "bg-border")} />}
          </div>
        );
      })}
    </div>
  );
}

function EditableGameRow({ game }: { game: ReturnType<typeof useLeague>["games"][number] }) {
  const { updateSpread } = useLeague();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(game.spread.toString());

  const home = TEAMS[game.homeTeamId];
  const away = TEAMS[game.awayTeamId];
  // spread is HOME perspective: negative = home favored
  const homeSpread = game.spread;
  const awaySpread = -game.spread;
  const homeFav = homeSpread < 0;

  function save() {
    const n = parseFloat(draft);
    if (!Number.isNaN(n)) updateSpread(game.id, n);
    setEditing(false);
  }
  function cancel() { setDraft(game.spread.toString()); setEditing(false); }
  function fmt(n: number) { return n > 0 ? `+${n}` : `${n}`; }

  return (
    <li className="rounded-lg border border-border bg-surface overflow-hidden">
      <div className="px-3 py-1.5 bg-background/40 flex items-center justify-between text-[9px] uppercase tracking-widest text-muted-foreground font-bold">
        <span>{SLOT_LABEL[game.slot]}</span>
        {editing ? (
          <div className="flex items-center gap-1 normal-case tracking-normal">
            <span className="text-foreground">{home.abbr} spread</span>
            <Input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              className="h-7 w-16 font-mono text-center bg-background"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter") save();
                if (e.key === "Escape") cancel();
              }}
            />
            <Button size="icon" className="size-7" onClick={save}><Check className="size-3.5" /></Button>
            <Button size="icon" variant="ghost" className="size-7" onClick={cancel}><X className="size-3.5" /></Button>
          </div>
        ) : (
          <button onClick={() => setEditing(true)} className="flex items-center gap-1 text-primary hover:underline normal-case tracking-normal">
            <Pencil className="size-3" /> Edit spread
          </button>
        )}
      </div>
      <div className="grid grid-cols-[1fr_auto_1fr] items-center">
        <TeamSideRow team={away} role="AWAY" spread={awaySpread} favored={!homeFav} />
        <div className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold px-2">@</div>
        <TeamSideRow team={home} role="HOME" spread={homeSpread} favored={homeFav} />
      </div>
    </li>
  );
}

function TeamSideRow({ team, role, spread, favored }: {
  team: typeof TEAMS[string]; role: "HOME" | "AWAY"; spread: number; favored: boolean;
}) {
  const fmt = (n: number) => (n > 0 ? `+${n}` : `${n}`);
  return (
    <div className="flex items-center gap-2 p-3 min-w-0">
      <TeamBadge teamId={team.id} size="sm" />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span className="text-[9px] uppercase tracking-widest font-bold text-muted-foreground">{role}</span>
          {favored && <span className="text-[9px] uppercase tracking-widest font-bold text-accent">FAV</span>}
        </div>
        <div className="font-display text-sm leading-tight truncate">{team.abbr}</div>
      </div>
      <span className={cn(
        "font-mono text-sm font-bold tabular-nums px-1.5 py-0.5 rounded",
        favored ? "text-accent" : "text-foreground",
      )}>{fmt(spread)}</span>
    </div>
  );
}

/* ---------- Evergreen announcement ---------- */

function AnnouncementBox() {
  const { postAnnouncement } = useLeague();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [posted, setPosted] = useState(false);

  function handlePost() {
    if (!title.trim()) return;
    postAnnouncement(title.trim(), body.trim());
    setTitle("");
    setBody("");
    setPosted(true);
    setTimeout(() => setPosted(false), 2200);
  }

  return (
    <section className="rounded-2xl border border-border bg-card p-5">
      <div className="flex items-center gap-2 mb-1">
        <Megaphone className="size-4 text-accent" />
        <h2 className="font-display text-lg">Post to the league</h2>
      </div>
      <p className="text-sm text-muted-foreground mb-4">
        Drop a hype message, share a take, call out a great pick. Lands on the feed instantly.
      </p>
      <div className="space-y-2">
        <Input
          placeholder="Headline (e.g. Midseason update — playoffs are tight)"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="bg-background"
        />
        <Textarea
          placeholder="Optional message body. Markdown not supported in v1, just plain words."
          value={body}
          onChange={(e) => setBody(e.target.value)}
          className="bg-background min-h-24"
        />
        <div className="flex items-center justify-between">
          <span className={cn("text-xs transition-opacity", posted ? "opacity-100 text-primary" : "opacity-0")}>
            <CircleDot className="size-3 inline mr-1" />
            Posted to feed.
          </span>
          <div className="flex gap-2">
            {(title || body) && (
              <Button variant="ghost" size="sm" onClick={() => { setTitle(""); setBody(""); }}>
                <RotateCcw className="size-3.5" /> Clear
              </Button>
            )}
            <Button onClick={handlePost} disabled={!title.trim()}>
              <Megaphone className="size-4" /> Post announcement
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
