const BASE_URL = 'https://api.the-odds-api.com/v4'

export async function fetchNFLOdds() {
  const res = await fetch(
    `${BASE_URL}/sports/americanfootball_nfl/odds?apiKey=${process.env.ODDS_API_KEY}&regions=us&markets=spreads`,
    { cache: 'no-store' }
  )
  if (!res.ok) throw new Error(`Odds API error: ${res.status}`)
  return res.json()
}

export async function fetchNFLScores(daysFrom = 1) {
  const res = await fetch(
    `${BASE_URL}/sports/americanfootball_nfl/scores?apiKey=${process.env.ODDS_API_KEY}&daysFrom=${daysFrom}`,
    { cache: 'no-store' }
  )
  if (!res.ok) throw new Error(`Odds API error: ${res.status}`)
  return res.json()
}
