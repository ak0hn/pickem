import type { Team } from "./types";

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
