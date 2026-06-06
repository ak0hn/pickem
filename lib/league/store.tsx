import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import { ALL_GAMES, FEED_SEED, GMS, SEED_ENTRIES, SEED_SLATE_STATUS, TEAMS } from "./data";
import type { DayOfWeek, FeedComment, FeedItem, GMEntry, Game, Pick } from "./types";

const DAYS: DayOfWeek[] = ["Tue", "Wed", "Thu", "Fri", "Sat", "Sun", "Mon"];

export type SlateStatus = "DRAFT" | "REVIEW" | "PUBLISHED";

type SimState = {
  currentWeek: number;
  day: DayOfWeek;
};

export type PickStatus = "pending" | "win" | "loss" | "push";

type LeagueState = {
  sim: SimState;
  games: Game[];
  entries: GMEntry[];
  feed: FeedItem[];
  slateStatus: Record<number, SlateStatus>;
  setSim: (s: Partial<SimState>) => void;
  advanceDay: () => void;
  simulateWeek: () => void;
  resetWeek: () => void;
  submitMyPicks: (week: number, picks: Pick[], mnfGuess?: number) => void;
  myEntry: (week: number) => GMEntry | undefined;

  pullLines: (week: number) => void;
  updateSpread: (gameId: string, spread: number) => void;
  publishSlate: (week: number, message: string) => void;
  postAnnouncement: (title: string, body: string) => void;

  toggleLike: (feedId: string) => void;
  addComment: (feedId: string, body: string) => void;

  isSlatePublished: (week: number) => boolean;
  getSlateStatus: (week: number) => SlateStatus;
  pickStatus: (pick: Pick) => { status: PickStatus; game: Game | undefined };
};

const Ctx = createContext<LeagueState | null>(null);
const YOU = "you";

function decide(g: Game): Game {
  if (g.finalAtsWinnerTeamId !== undefined) return g;
  const seed = (g.homeTeamId.charCodeAt(0) + g.awayTeamId.charCodeAt(0) + g.week * 11) % 60;
  const homeScore = 14 + (seed % 24);
  const awayScore = 10 + ((seed * 7) % 28);
  const margin = homeScore - awayScore;
  const adj = margin + g.spread;
  const winner = Math.abs(adj) < 0.01 ? null : adj > 0 ? g.homeTeamId : g.awayTeamId;
  return { ...g, homeScore, awayScore, finalAtsWinnerTeamId: winner };
}

export function LeagueProvider({ children }: { children: ReactNode }) {
  const [sim, setSimState] = useState<SimState>({ currentWeek: 8, day: "Thu" });
  const [games, setGames] = useState<Game[]>(ALL_GAMES);
  const [entries, setEntries] = useState<GMEntry[]>(SEED_ENTRIES);
  const [feed, setFeed] = useState<FeedItem[]>(FEED_SEED);
  const [slateStatus, setSlateStatus] = useState<Record<number, SlateStatus>>(SEED_SLATE_STATUS);

  const value = useMemo<LeagueState>(() => ({
    sim,
    games,
    entries,
    feed,
    slateStatus,
    setSim: (s) => setSimState((p) => ({ ...p, ...s })),
    advanceDay: () => {
      setSimState((p) => {
        const i = DAYS.indexOf(p.day);
        if (i === DAYS.length - 1) return { currentWeek: p.currentWeek + 1, day: "Tue" };
        return { ...p, day: DAYS[i + 1] };
      });
    },
    simulateWeek: () => {
      setGames((prev) => prev.map((g) => (g.week === sim.currentWeek ? decide(g) : g)));
      setFeed((prev) => [
        {
          id: `f-w${sim.currentWeek}-results-${Date.now()}`,
          kind: "RESULTS",
          week: sim.currentWeek,
          postedAt: new Date().toISOString(),
          title: `Week ${sim.currentWeek} results are in`,
          body: "Tap into standings to see how everyone shook out.",
          likes: [],
          comments: [],
        },
        ...prev,
      ]);
      setSimState({ currentWeek: sim.currentWeek + 1, day: "Tue" });
    },
    resetWeek: () => {
      setGames(ALL_GAMES);
      setEntries(SEED_ENTRIES);
      setFeed(FEED_SEED);
      setSlateStatus(SEED_SLATE_STATUS);
      setSimState({ currentWeek: 8, day: "Thu" });
    },
    submitMyPicks: (week, picks, mnfGuess) => {
      setEntries((prev) => {
        const others = prev.filter((e) => !(e.gmId === YOU && e.week === week));
        return [
          ...others,
          { gmId: YOU, week, picks, submittedAt: new Date().toISOString(), mnfTotalGuess: mnfGuess },
        ];
      });
    },
    myEntry: (week) => entries.find((e) => e.gmId === YOU && e.week === week),

    pullLines: (week) => {
      setSlateStatus((prev) => ({ ...prev, [week]: "REVIEW" }));
    },
    updateSpread: (gameId, spread) => {
      setGames((prev) => prev.map((g) => (g.id === gameId ? { ...g, spread } : g)));
    },
    publishSlate: (week, message) => {
      setSlateStatus((prev) => ({ ...prev, [week]: "PUBLISHED" }));
      const wkGames = games.filter((g) => g.week === week);
      setFeed((prev) => [
        {
          id: `f-w${week}-slate-${Date.now()}`,
          kind: "SLATE_PUBLISHED",
          week,
          postedAt: new Date().toISOString(),
          title: `Week ${week} slate is live`,
          body: message.trim() || `${wkGames.length} games on the board. Pick 6. Lock 'em before kickoff.`,
          ctaWeek: week,
          likes: [],
          comments: [],
        },
        ...prev,
      ]);
    },
    postAnnouncement: (title, body) => {
      setFeed((prev) => [
        {
          id: `f-ann-${Date.now()}`,
          kind: "ANNOUNCEMENT",
          week: sim.currentWeek,
          postedAt: new Date().toISOString(),
          title,
          body,
          likes: [],
          comments: [],
        },
        ...prev,
      ]);
    },

    toggleLike: (feedId) => {
      setFeed((prev) => prev.map((f) => {
        if (f.id !== feedId) return f;
        const likes = f.likes ?? [];
        return { ...f, likes: likes.includes(YOU) ? likes.filter((g) => g !== YOU) : [...likes, YOU] };
      }));
    },
    addComment: (feedId, body) => {
      const trimmed = body.trim();
      if (!trimmed) return;
      const c: FeedComment = { id: `c-${Date.now()}`, gmId: YOU, body: trimmed, postedAt: new Date().toISOString() };
      setFeed((prev) => prev.map((f) => f.id === feedId ? { ...f, comments: [...(f.comments ?? []), c] } : f));
    },

    isSlatePublished: (week) => (slateStatus[week] ?? "DRAFT") === "PUBLISHED",
    getSlateStatus: (week) => slateStatus[week] ?? "DRAFT",
    pickStatus: (pick) => {
      const g = games.find((x) => x.id === pick.gameId);
      if (!g || g.finalAtsWinnerTeamId === undefined) return { status: "pending", game: g };
      if (g.finalAtsWinnerTeamId === null) return { status: "push", game: g };
      const picked = pick.side === "HOME" ? g.homeTeamId : g.awayTeamId;
      return { status: g.finalAtsWinnerTeamId === picked ? "win" : "loss", game: g };
    },
  }), [sim, games, entries, feed, slateStatus]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useLeague() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useLeague must be inside LeagueProvider");
  return v;
}

export { TEAMS, GMS };
export const YOU_ID = YOU;

export function picksLockedForWeek(day: DayOfWeek): boolean {
  return day === "Fri" || day === "Sat" || day === "Sun" || day === "Mon";
}

export function weekIsComplete(games: Game[], week: number): boolean {
  return games.filter((g) => g.week === week).every((g) => g.finalAtsWinnerTeamId !== undefined);
}

export function scoreEntry(entry: GMEntry, games: Game[]): { wins: number; losses: number; pushes: number; decided: number } {
  let wins = 0, losses = 0, pushes = 0, decided = 0;
  for (const p of entry.picks) {
    const g = games.find((x) => x.id === p.gameId);
    if (!g || g.finalAtsWinnerTeamId === undefined) continue;
    decided++;
    const picked = p.side === "HOME" ? g.homeTeamId : g.awayTeamId;
    if (g.finalAtsWinnerTeamId === null) pushes++;
    else if (g.finalAtsWinnerTeamId === picked) wins++;
    else losses++;
  }
  return { wins, losses, pushes, decided };
}

export function fmtDateTime(iso: string): string {
  const d = new Date(iso);
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const m = months[d.getUTCMonth()];
  const day = d.getUTCDate();
  let h = d.getUTCHours();
  const min = d.getUTCMinutes().toString().padStart(2, "0");
  const ampm = h >= 12 ? "PM" : "AM";
  h = h % 12 || 12;
  return `${m} ${day} · ${h}:${min} ${ampm}`;
}
