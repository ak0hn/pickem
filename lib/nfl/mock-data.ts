// Mock NFL schedule and score data for dev/test mode (MOCK_ODDS=true)
// Thu–SNF slate only — MNF is tiebreaker only and handled separately

export function getMockSchedule() {
  return getMockGames().map((g) => ({ ...g, spread: 0, spread_favorite: 'home' as const }))
}

export function getMockGames() {
  const now = new Date()
  const daysUntilThursday = (4 - now.getDay() + 7) % 7 || 7
  const thursday = new Date(now)
  thursday.setDate(now.getDate() + daysUntilThursday)
  thursday.setHours(20, 20, 0, 0)

  const sunday = new Date(thursday)
  sunday.setDate(thursday.getDate() + 3)

  const t = (h: number, m: number) => { const d = new Date(thursday); d.setHours(h, m, 0, 0); return d.toISOString() }
  const s = (h: number, m: number) => { const d = new Date(sunday);   d.setHours(h, m, 0, 0); return d.toISOString() }

  return [
    { home_team: 'Cincinnati Bengals',     away_team: 'Baltimore Ravens',     spread: 1.5, spread_favorite: 'away', kickoff_time: t(20,20), day: 'thursday', is_tiebreaker: false, external_id: 'mock_1' },
    { home_team: 'New England Patriots',   away_team: 'Buffalo Bills',        spread: 3.0, spread_favorite: 'away', kickoff_time: s(13,0),  day: 'sunday',   is_tiebreaker: false, external_id: 'mock_2' },
    { home_team: 'Indianapolis Colts',     away_team: 'New York Jets',        spread: 3.0, spread_favorite: 'home', kickoff_time: s(13,0),  day: 'sunday',   is_tiebreaker: false, external_id: 'mock_3' },
    { home_team: 'Houston Texans',         away_team: 'Jacksonville Jaguars', spread: 2.5, spread_favorite: 'home', kickoff_time: s(13,0),  day: 'sunday',   is_tiebreaker: false, external_id: 'mock_4' },
    { home_team: 'New Orleans Saints',     away_team: 'Carolina Panthers',    spread: 4.5, spread_favorite: 'home', kickoff_time: s(13,0),  day: 'sunday',   is_tiebreaker: false, external_id: 'mock_5' },
    { home_team: 'Detroit Lions',          away_team: 'Chicago Bears',        spread: 7.0, spread_favorite: 'home', kickoff_time: s(13,0),  day: 'sunday',   is_tiebreaker: false, external_id: 'mock_6' },
    { home_team: 'New York Giants',        away_team: 'Green Bay Packers',    spread: 5.5, spread_favorite: 'away', kickoff_time: s(13,0),  day: 'sunday',   is_tiebreaker: false, external_id: 'mock_7' },
    { home_team: 'Dallas Cowboys',         away_team: 'Philadelphia Eagles',  spread: 1.0, spread_favorite: 'away', kickoff_time: s(13,0),  day: 'sunday',   is_tiebreaker: false, external_id: 'mock_8' },
    { home_team: 'Tennessee Titans',       away_team: 'Pittsburgh Steelers',  spread: 4.0, spread_favorite: 'away', kickoff_time: s(13,0),  day: 'sunday',   is_tiebreaker: false, external_id: 'mock_9' },
    { home_team: 'Atlanta Falcons',        away_team: 'Arizona Cardinals',    spread: 3.0, spread_favorite: 'home', kickoff_time: s(13,0),  day: 'sunday',   is_tiebreaker: false, external_id: 'mock_10' },
    { home_team: 'Denver Broncos',         away_team: 'Las Vegas Raiders',    spread: 3.5, spread_favorite: 'home', kickoff_time: s(16,25), day: 'sunday',   is_tiebreaker: false, external_id: 'mock_11' },
    { home_team: 'Kansas City Chiefs',     away_team: 'Los Angeles Chargers', spread: 6.5, spread_favorite: 'home', kickoff_time: s(16,25), day: 'sunday',   is_tiebreaker: false, external_id: 'mock_12' },
    { home_team: 'Washington Commanders',  away_team: 'Tampa Bay Buccaneers', spread: 2.5, spread_favorite: 'home', kickoff_time: s(16,25), day: 'sunday',   is_tiebreaker: false, external_id: 'mock_13' },
    { home_team: 'Los Angeles Rams',       away_team: 'Seattle Seahawks',     spread: 2.5, spread_favorite: 'home', kickoff_time: s(16,25), day: 'sunday',   is_tiebreaker: false, external_id: 'mock_14' },
    { home_team: 'Minnesota Vikings',      away_team: 'San Francisco 49ers',  spread: 1.0, spread_favorite: 'away', kickoff_time: s(16,25), day: 'sunday',   is_tiebreaker: false, external_id: 'mock_15' },
    { home_team: 'Miami Dolphins',         away_team: 'Cleveland Browns',     spread: 2.5, spread_favorite: 'home', kickoff_time: s(20,20), day: 'sunday',   is_tiebreaker: false, external_id: 'mock_16' },
  ]
}

export function getMockScores() {
  return [
    { external_id: 'mock_1',  home_score: 20, away_score: 27 }, // BAL wins 27-20, covers -1.5
    { external_id: 'mock_2',  home_score: 10, away_score: 27 },
    { external_id: 'mock_3',  home_score: 21, away_score: 14 },
    { external_id: 'mock_4',  home_score: 28, away_score: 20 },
    { external_id: 'mock_5',  home_score: 31, away_score: 14 },
    { external_id: 'mock_6',  home_score: 27, away_score: 20 },
    { external_id: 'mock_7',  home_score: 17, away_score: 24 },
    { external_id: 'mock_8',  home_score: 17, away_score: 24 },
    { external_id: 'mock_9',  home_score: 21, away_score: 17 },
    { external_id: 'mock_10', home_score: 24, away_score: 17 },
    { external_id: 'mock_11', home_score: 24, away_score: 20 },
    { external_id: 'mock_12', home_score: 35, away_score: 14 },
    { external_id: 'mock_13', home_score: 24, away_score: 17 },
    { external_id: 'mock_14', home_score: 27, away_score: 24 },
    { external_id: 'mock_15', home_score: 14, away_score: 28 },
    { external_id: 'mock_16', home_score: 27, away_score: 20 },
  ]
}

export function getMockMNFGame() {
  const now = new Date()
  const daysUntilMonday = (1 - now.getDay() + 7) % 7 || 7
  const monday = new Date(now)
  monday.setDate(now.getDate() + daysUntilMonday)
  monday.setHours(20, 15, 0, 0)
  return {
    home_team: 'Philadelphia Eagles',
    away_team: 'Chicago Bears',
    spread: 7.5,
    spread_favorite: 'home' as const,
    kickoff_time: monday.toISOString(),
    day: 'monday',
    is_tiebreaker: true,
    external_id: 'mock_mnf',
  }
}

export function getMockMNFScore() {
  // PHI -7.5 vs CHI, PHI wins 28-14 → margin 14 > 7.5 → home_win
  return { home_score: 28, away_score: 14 }
}

export function parseOddsApiGames(oddsData: any[]) {
  const games = []
  for (const event of oddsData) {
    const spreadsMarket = event.bookmakers?.[0]?.markets?.find((m: any) => m.key === 'spreads')
    if (!spreadsMarket) continue

    const homeOutcome = spreadsMarket.outcomes.find((o: any) => o.name === event.home_team)
    const awayOutcome = spreadsMarket.outcomes.find((o: any) => o.name === event.away_team)
    if (!homeOutcome || !awayOutcome) continue

    const kickoff = new Date(event.commence_time)
    const dayMap: Record<number, string> = { 0: 'sunday', 1: 'monday', 4: 'thursday', 5: 'friday', 6: 'saturday' }
    const gameDay = dayMap[kickoff.getDay()] ?? 'sunday'
    const homeSpread = homeOutcome.point

    games.push({
      home_team: event.home_team,
      away_team: event.away_team,
      spread: Math.abs(homeSpread),
      spread_favorite: homeSpread < 0 ? 'home' : 'away',
      kickoff_time: kickoff.toISOString(),
      day: gameDay,
      is_tiebreaker: false,
      external_id: event.id,
    })
  }
  return games
}
