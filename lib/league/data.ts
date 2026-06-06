import type { Team, Game, GM, FeedItem, GMEntry } from "./types";

// Maps Odds API full team names → abbreviations used in TEAMS
export const NFL_FULL_TO_ABBR: Record<string, string> = {
  'Arizona Cardinals': 'ARI', 'Atlanta Falcons': 'ATL', 'Baltimore Ravens': 'BAL',
  'Buffalo Bills': 'BUF', 'Carolina Panthers': 'CAR', 'Chicago Bears': 'CHI',
  'Cincinnati Bengals': 'CIN', 'Cleveland Browns': 'CLE', 'Dallas Cowboys': 'DAL',
  'Denver Broncos': 'DEN', 'Detroit Lions': 'DET', 'Green Bay Packers': 'GB',
  'Houston Texans': 'HOU', 'Indianapolis Colts': 'IND', 'Jacksonville Jaguars': 'JAX',
  'Kansas City Chiefs': 'KC', 'Las Vegas Raiders': 'LV', 'Los Angeles Chargers': 'LAC',
  'Los Angeles Rams': 'LAR', 'Miami Dolphins': 'MIA', 'Minnesota Vikings': 'MIN',
  'New England Patriots': 'NE', 'New Orleans Saints': 'NO', 'New York Giants': 'NYG',
  'New York Jets': 'NYJ', 'Philadelphia Eagles': 'PHI', 'Pittsburgh Steelers': 'PIT',
  'San Francisco 49ers': 'SF', 'Seattle Seahawks': 'SEA', 'Tampa Bay Buccaneers': 'TB',
  'Tennessee Titans': 'TEN', 'Washington Commanders': 'WAS',
}

export function normalizeTeam(name: string): string {
  return NFL_FULL_TO_ABBR[name] ?? name
}

export const TEAMS: Record<string, Team> = {
  ARI: { id: "ARI", abbr: "ARI", city: "Arizona",       name: "Cardinals",  color: "#97233F" },
  ATL: { id: "ATL", abbr: "ATL", city: "Atlanta",       name: "Falcons",    color: "#A71930" },
  BAL: { id: "BAL", abbr: "BAL", city: "Baltimore",     name: "Ravens",     color: "#241773" },
  BUF: { id: "BUF", abbr: "BUF", city: "Buffalo",       name: "Bills",      color: "#00338D" },
  CAR: { id: "CAR", abbr: "CAR", city: "Carolina",      name: "Panthers",   color: "#0085CA" },
  CHI: { id: "CHI", abbr: "CHI", city: "Chicago",       name: "Bears",      color: "#0B162A" },
  CIN: { id: "CIN", abbr: "CIN", city: "Cincinnati",    name: "Bengals",    color: "#FB4F14" },
  CLE: { id: "CLE", abbr: "CLE", city: "Cleveland",     name: "Browns",     color: "#311D00" },
  DAL: { id: "DAL", abbr: "DAL", city: "Dallas",        name: "Cowboys",    color: "#003594" },
  DEN: { id: "DEN", abbr: "DEN", city: "Denver",        name: "Broncos",    color: "#FB4F14" },
  DET: { id: "DET", abbr: "DET", city: "Detroit",       name: "Lions",      color: "#0076B6" },
  GB:  { id: "GB",  abbr: "GB",  city: "Green Bay",     name: "Packers",    color: "#203731" },
  HOU: { id: "HOU", abbr: "HOU", city: "Houston",       name: "Texans",     color: "#03202F" },
  IND: { id: "IND", abbr: "IND", city: "Indianapolis",  name: "Colts",      color: "#002C5F" },
  JAX: { id: "JAX", abbr: "JAX", city: "Jacksonville",  name: "Jaguars",    color: "#101820" },
  KC:  { id: "KC",  abbr: "KC",  city: "Kansas City",   name: "Chiefs",     color: "#E31837" },
  LV:  { id: "LV",  abbr: "LV",  city: "Las Vegas",     name: "Raiders",    color: "#000000" },
  LAC: { id: "LAC", abbr: "LAC", city: "Los Angeles",   name: "Chargers",   color: "#0080C6" },
  LAR: { id: "LAR", abbr: "LAR", city: "Los Angeles",   name: "Rams",       color: "#003594" },
  MIA: { id: "MIA", abbr: "MIA", city: "Miami",         name: "Dolphins",   color: "#008E97" },
  MIN: { id: "MIN", abbr: "MIN", city: "Minnesota",     name: "Vikings",    color: "#4F2683" },
  NE:  { id: "NE",  abbr: "NE",  city: "New England",   name: "Patriots",   color: "#002244" },
  NO:  { id: "NO",  abbr: "NO",  city: "New Orleans",   name: "Saints",     color: "#D3BC8D" },
  NYG: { id: "NYG", abbr: "NYG", city: "New York",      name: "Giants",     color: "#0B2265" },
  NYJ: { id: "NYJ", abbr: "NYJ", city: "New York",      name: "Jets",       color: "#125740" },
  PHI: { id: "PHI", abbr: "PHI", city: "Philadelphia",  name: "Eagles",     color: "#004C54" },
  PIT: { id: "PIT", abbr: "PIT", city: "Pittsburgh",    name: "Steelers",   color: "#FFB612" },
  SF:  { id: "SF",  abbr: "SF",  city: "San Francisco", name: "49ers",      color: "#AA0000" },
  SEA: { id: "SEA", abbr: "SEA", city: "Seattle",       name: "Seahawks",   color: "#002244" },
  TB:  { id: "TB",  abbr: "TB",  city: "Tampa Bay",     name: "Buccaneers", color: "#D50A0A" },
  TEN: { id: "TEN", abbr: "TEN", city: "Tennessee",     name: "Titans",     color: "#0C2340" },
  WAS: { id: "WAS", abbr: "WAS", city: "Washington",    name: "Commanders", color: "#5A1414" },
};

export const GMS: GM[] = [
  { id: "you",     handle: "you",         avatarHue: 142, isCommissioner: true, isYou: true },
  { id: "mason",   handle: "mason_b",     avatarHue: 25 },
  { id: "tara",    handle: "tara.k",      avatarHue: 280 },
  { id: "deon",    handle: "deon99",      avatarHue: 200 },
  { id: "rich",    handle: "rich_play",   avatarHue: 60 },
  { id: "kim",     handle: "kim.fades",   avatarHue: 320 },
  { id: "leo",     handle: "leo_locks",   avatarHue: 170 },
  { id: "sam",     handle: "sam.dog",     avatarHue: 40 },
  { id: "ari",     handle: "ari.7",       avatarHue: 250 },
  { id: "jules",   handle: "jules_v",     avatarHue: 100 },
];

// Realistic NFL week: 14 games (4 teams on bye) with proper slot distribution.
// Real layout: 1 TNF, ~9 Sun early (1pm), 2 Sun late (4pm), 1 SNF, 1 MNF.
function makeWeek(week: number, seed: number): Game[] {
  const teams = Object.keys(TEAMS);
  // Deterministic shuffle so weeks vary but are stable
  const shuffled = [...teams].sort((a, b) =>
    ((a.charCodeAt(0) * (week + 1) + a.charCodeAt(a.length - 1) + seed) % 31) -
    ((b.charCodeAt(0) * (week + 2) + b.charCodeAt(b.length - 1) + seed) % 31)
  );
  // 4 teams on bye -> 28 playing -> 14 matchups
  const playing = shuffled.slice(0, 28);
  const matchups: [string, string][] = [];
  for (let i = 0; i < playing.length; i += 2) matchups.push([playing[i], playing[i + 1]]);

  const slots: Game["slot"][] = [
    "TNF",
    "SUN_EARLY", "SUN_EARLY", "SUN_EARLY", "SUN_EARLY", "SUN_EARLY",
    "SUN_EARLY", "SUN_EARLY", "SUN_EARLY", "SUN_EARLY",
    "SUN_LATE", "SUN_LATE",
    "SNF",
    "MNF",
  ];
  const weekStart = new Date(Date.UTC(2025, 8, 4 + (week - 1) * 7)); // Thursday
  const slotOffsets: Record<Game["slot"], [number, number]> = {
    TNF: [0, 20],
    SUN_EARLY: [3, 17],
    SUN_LATE: [3, 20],
    SNF: [3, 23],
    MNF: [4, 20],
  };
  return matchups.map((m, i) => {
    const slot = slots[i];
    const [dOff, hr] = slotOffsets[slot];
    const ko = new Date(weekStart);
    ko.setUTCDate(ko.getUTCDate() + dOff);
    ko.setUTCHours(hr, 0, 0, 0);
    const spreadRaw = (((m[0].charCodeAt(0) + week * 7 + i) % 13) - 6) + 0.5;
    return {
      id: `w${week}-g${i}`,
      week,
      slot,
      kickoff: ko.toISOString(),
      homeTeamId: m[0],
      awayTeamId: m[1],
      spread: spreadRaw,
    };
  });
}

export const ALL_GAMES: Game[] = [];
for (let w = 1; w <= 18; w++) ALL_GAMES.push(...makeWeek(w, w * 13));

// Pre-fill results for weeks 1-7 (mid-season, currently week 8)
function decideResult(g: Game): Game {
  const seed = (g.homeTeamId.charCodeAt(0) + g.awayTeamId.charCodeAt(0) + g.week * 11) % 60;
  const homeScore = 14 + (seed % 24);
  const awayScore = 10 + ((seed * 7) % 28);
  const margin = homeScore - awayScore; // home positive
  // spread negative means home favored; ATS: home covers if margin > -spread
  const adj = margin + g.spread;
  let winner: string | null;
  if (Math.abs(adj) < 0.01) winner = null;
  else winner = adj > 0 ? g.homeTeamId : g.awayTeamId;
  return { ...g, homeScore, awayScore, finalAtsWinnerTeamId: winner };
}
for (let i = 0; i < ALL_GAMES.length; i++) {
  if (ALL_GAMES[i].week <= 7) ALL_GAMES[i] = decideResult(ALL_GAMES[i]);
}

// Seed picks for weeks 1-7 for all GMs (deterministic)
export const SEED_ENTRIES: GMEntry[] = [];
for (const gm of GMS) {
  for (let w = 1; w <= 7; w++) {
    const wkGames = ALL_GAMES.filter(g => g.week === w);
    const seed = (gm.id.charCodeAt(0) + w * 17) % 7;
    const pickGames = wkGames.slice(0, 6);
    SEED_ENTRIES.push({
      gmId: gm.id,
      week: w,
      picks: pickGames.map((g, i) => ({
        gameId: g.id,
        side: ((seed + i + gm.id.length) % 2 === 0 ? "HOME" : "AWAY"),
      })),
      submittedAt: new Date(Date.UTC(2025, 8, 4 + (w - 1) * 7 + 2)).toISOString(),
    });
  }
}

// Week 8 NOT yet published — commissioner needs to drop it Thursday morning.
export const FEED_SEED: FeedItem[] = [
  {
    id: "f-w7-results",
    kind: "RESULTS",
    week: 7,
    postedAt: new Date(Date.UTC(2025, 9, 20, 20, 0)).toISOString(),
    title: "Week 7 in the books",
    body: "leo_locks went 5-1 to take the week. Two GMs finished 1-5. Brutal.",
  },
  {
    id: "f-w7-standings",
    kind: "STANDINGS_UPDATE",
    week: 7,
    postedAt: new Date(Date.UTC(2025, 9, 20, 20, 5)).toISOString(),
    title: "Standings updated through Week 7",
    body: "leo_locks pulls ahead. You're 3rd, one game out.",
  },
];

// Slate workflow status: weeks 1-7 are PUBLISHED (past), week 8 is DRAFT (lines not pulled).
export const SEED_SLATE_STATUS: Record<number, "DRAFT" | "REVIEW" | "PUBLISHED"> = (() => {
  const out: Record<number, "DRAFT" | "REVIEW" | "PUBLISHED"> = {};
  for (let w = 1; w <= 7; w++) out[w] = "PUBLISHED";
  out[8] = "DRAFT";
  return out;
})();

