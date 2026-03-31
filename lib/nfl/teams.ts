export type TeamInfo = { abbr: string; color: string; light?: boolean }

export const NFL_TEAMS: Record<string, TeamInfo> = {
  'Arizona Cardinals':     { abbr: 'ARI', color: '#97233F' },
  'Atlanta Falcons':       { abbr: 'ATL', color: '#A71930' },
  'Baltimore Ravens':      { abbr: 'BAL', color: '#241773' },
  'Buffalo Bills':         { abbr: 'BUF', color: '#00338D' },
  'Carolina Panthers':     { abbr: 'CAR', color: '#0085CA' },
  'Chicago Bears':         { abbr: 'CHI', color: '#0B162A' },
  'Cincinnati Bengals':    { abbr: 'CIN', color: '#FB4F14' },
  'Cleveland Browns':      { abbr: 'CLE', color: '#311D00' },
  'Dallas Cowboys':        { abbr: 'DAL', color: '#003594' },
  'Denver Broncos':        { abbr: 'DEN', color: '#FB4F14' },
  'Detroit Lions':         { abbr: 'DET', color: '#0076B6' },
  'Green Bay Packers':     { abbr: 'GB',  color: '#203731' },
  'Houston Texans':        { abbr: 'HOU', color: '#03202F' },
  'Indianapolis Colts':    { abbr: 'IND', color: '#002C5F' },
  'Jacksonville Jaguars':  { abbr: 'JAX', color: '#006778' },
  'Kansas City Chiefs':    { abbr: 'KC',  color: '#E31837' },
  'Las Vegas Raiders':     { abbr: 'LV',  color: '#A5ACAF', light: true },
  'Los Angeles Chargers':  { abbr: 'LAC', color: '#0080C6' },
  'Los Angeles Rams':      { abbr: 'LAR', color: '#003594' },
  'Miami Dolphins':        { abbr: 'MIA', color: '#008E97' },
  'Minnesota Vikings':     { abbr: 'MIN', color: '#4F2683' },
  'New England Patriots':  { abbr: 'NE',  color: '#002244' },
  'New Orleans Saints':    { abbr: 'NO',  color: '#9F8958', light: true },
  'New York Giants':       { abbr: 'NYG', color: '#0B2265' },
  'New York Jets':         { abbr: 'NYJ', color: '#125740' },
  'Philadelphia Eagles':   { abbr: 'PHI', color: '#004C54' },
  'Pittsburgh Steelers':   { abbr: 'PIT', color: '#FFB612', light: true },
  'San Francisco 49ers':   { abbr: 'SF',  color: '#AA0000' },
  'Seattle Seahawks':      { abbr: 'SEA', color: '#002244' },
  'Tampa Bay Buccaneers':  { abbr: 'TB',  color: '#D50A0A' },
  'Tennessee Titans':      { abbr: 'TEN', color: '#0C2340' },
  'Washington Commanders': { abbr: 'WSH', color: '#5A1414' },
}

export const ALL_NFL_TEAMS = Object.keys(NFL_TEAMS)

export function getTeam(name: string): TeamInfo {
  return NFL_TEAMS[name] ?? { abbr: name.slice(0, 3).toUpperCase(), color: '#374151' }
}
