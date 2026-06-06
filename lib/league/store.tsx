'use client'

import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react'
import { createClient } from '@/lib/supabase/client'
import { TEAMS } from './data'
import type { DayOfWeek, Game, GMEntry, GM, FeedItem, Pick, PickSide, FeedComment, GameSlot } from './types'

// ── Re-exports pages depend on ────────────────────────────────────────────────
export { TEAMS } from './data'
export type PickStatus = 'pending' | 'win' | 'loss' | 'push'
export type SlateStatus = 'DRAFT' | 'REVIEW' | 'PUBLISHED'

// ── Helpers ───────────────────────────────────────────────────────────────────
export function fmtDateTime(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
  })
}

export function scoreEntry(entry: GMEntry, games: Game[]): { wins: number; losses: number; pushes: number } {
  let wins = 0, losses = 0, pushes = 0
  for (const pick of entry.picks) {
    const g = games.find((x) => x.id === pick.gameId)
    if (!g || g.finalAtsWinnerTeamId === undefined) continue
    if (g.finalAtsWinnerTeamId === null) { pushes++; continue }
    const pickedId = pick.side === 'HOME' ? g.homeTeamId : g.awayTeamId
    if (pickedId === g.finalAtsWinnerTeamId) wins++
    else losses++
  }
  return { wins, losses, pushes }
}

// ── DB → UI type converters ───────────────────────────────────────────────────

function dayToSlot(day: string, kickoff: string): GameSlot {
  if (day === 'thursday') return 'TNF'
  if (day === 'monday') return 'MNF'
  if (day === 'friday' || day === 'saturday') return 'SUN_EARLY'
  const hour = new Date(kickoff).getUTCHours()
  if (hour < 17) return 'SUN_EARLY'
  if (hour < 21) return 'SUN_LATE'
  return 'SNF'
}

function dbGameToMock(g: any, weekNumber: number): Game {
  let finalAtsWinnerTeamId: string | null | undefined = undefined
  if (g.result_confirmed) {
    if (g.result === 'home_win') finalAtsWinnerTeamId = g.home_team
    else if (g.result === 'away_win') finalAtsWinnerTeamId = g.away_team
    else finalAtsWinnerTeamId = null
  }
  // DB spread is always positive; spread_favorite indicates who is favored
  // Mock spread is from home perspective: negative = home favored
  const spread = g.spread_favorite === 'home' ? -Number(g.spread) : Number(g.spread)
  return {
    id: g.id,
    week: weekNumber,
    slot: dayToSlot(g.day, g.kickoff_time),
    kickoff: g.kickoff_time,
    homeTeamId: g.home_team,
    awayTeamId: g.away_team,
    spread,
    finalAtsWinnerTeamId,
  }
}

function hashHue(str: string): number {
  let h = 0
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) & 0xffff
  return h % 360
}

function dbUserToGM(u: any, currentUserId: string): GM {
  const handle = (u.name ?? u.email.split('@')[0]).replace(/\s+/g, '_').toLowerCase()
  return {
    id: u.id,
    handle,
    avatarHue: hashHue(u.id),
    isCommissioner: u.role === 'commissioner',
    isYou: u.id === currentUserId,
  }
}

function dbAnnouncementToFeedItem(
  a: any,
  weekNumber: number | null,
  reactions: any[],
  comments: any[],
): FeedItem {
  const TYPE_MAP: Record<string, FeedItem['kind']> = {
    slate: 'SLATE_PUBLISHED',
    results: 'RESULTS',
    tiebreaker: 'TIEBREAKER_CALL',
    general: 'ANNOUNCEMENT',
    pre_snf_update: 'ANNOUNCEMENT',
  }
  const itemReactions = reactions.filter((r) => r.announcement_id === a.id && r.emoji === '👍')
  const itemComments = comments.filter((c) => c.announcement_id === a.id)
  const wn = weekNumber ?? 1

  const title =
    a.type === 'slate' ? `Week ${wn} slate is live — pick 6`
    : a.type === 'results' ? `Week ${wn} results`
    : a.type === 'tiebreaker' ? `Tiebreaker — Week ${wn} MNF`
    : a.content.split('\n')[0].slice(0, 80)

  return {
    id: a.id,
    kind: TYPE_MAP[a.type] ?? 'ANNOUNCEMENT',
    week: wn,
    postedAt: a.created_at,
    title,
    body: a.content,
    ctaWeek: a.type === 'slate' ? wn : undefined,
    likes: itemReactions.map((r: any) => r.user_id),
    comments: itemComments.map((c: any): FeedComment => ({
      id: c.id,
      gmId: c.user_id,
      body: c.content,
      postedAt: c.created_at,
    })),
  }
}

// ── State type ────────────────────────────────────────────────────────────────

type DbWeek = {
  id: string
  week_number: number
  season_year: number
  status: string
  thursday_kickoff: string | null
}

type LeagueState = {
  loading: boolean
  games: Game[]
  entries: GMEntry[]
  feed: FeedItem[]
  gms: GM[]
  youId: string
  isCommissioner: boolean
  weekLocked: boolean
  activeWeek: DbWeek | null
  sim: { currentWeek: number; day: DayOfWeek }

  myEntry: (week: number) => GMEntry | undefined
  isSlatePublished: (week: number) => boolean
  getSlateStatus: (week: number) => SlateStatus
  pickStatus: (pick: Pick) => { status: PickStatus; game: Game | undefined }

  submitMyPicks: (week: number, picks: Pick[]) => Promise<void>
  toggleLike: (feedId: string) => void
  addComment: (feedId: string, body: string) => void
  pullLines: (week: number) => Promise<void>
  updateSpread: (gameId: string, spread: number) => Promise<void>
  publishSlate: (week: number, message: string) => Promise<void>
  postAnnouncement: (title: string, body: string) => void
  refresh: () => void
}

const Ctx = createContext<LeagueState | null>(null)

export function useLeague(): LeagueState {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useLeague must be used inside LeagueProvider')
  return ctx
}

// ── Provider ──────────────────────────────────────────────────────────────────

export function LeagueProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true)
  const [games, setGames] = useState<Game[]>([])
  const [entries, setEntries] = useState<GMEntry[]>([])
  const [feed, setFeed] = useState<FeedItem[]>([])
  const [gms, setGms] = useState<GM[]>([])
  const [youId, setYouId] = useState('')
  const [isCommissioner, setIsCommissioner] = useState(false)
  const [activeWeek, setActiveWeek] = useState<DbWeek | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)

  const refresh = useCallback(() => setRefreshKey((k) => k + 1), [])

  useEffect(() => {
    let cancelled = false
    const supabase = createClient()

    async function fetchAll() {
      setLoading(true)

      const { data: { user } } = await supabase.auth.getUser()
      if (!user || cancelled) return

      const uid = user.id
      setYouId(uid)

      const { data: profile } = await supabase
        .from('users')
        .select('role')
        .eq('id', uid)
        .maybeSingle()
      if (cancelled) return
      setIsCommissioner(profile?.role === 'commissioner')

      const { data: usersRaw } = await supabase
        .from('users')
        .select('id, name, email, role')
        .order('name')
      if (cancelled) return
      setGms((usersRaw ?? []).map((u: any) => dbUserToGM(u, uid)))

      // Active week: latest non-closed week
      const { data: weeksRaw } = await supabase
        .from('weeks')
        .select('*')
        .neq('status', 'closed')
        .order('week_number', { ascending: false })
        .limit(1)
      const week: DbWeek | null = weeksRaw?.[0] ?? null
      if (cancelled) return
      setActiveWeek(week)

      // Games for active week (non-tiebreaker)
      let weekGames: Game[] = []
      if (week) {
        const { data: gamesRaw } = await supabase
          .from('games')
          .select('*')
          .eq('week_id', week.id)
          .eq('is_tiebreaker', false)
          .order('kickoff_time')
        weekGames = (gamesRaw ?? []).map((g: any) => dbGameToMock(g, week.week_number))
      }

      // Historical games from closed weeks (for standings scoring)
      const { data: closedWeeks } = await supabase
        .from('weeks')
        .select('id, week_number')
        .eq('status', 'closed')
      let historicalGames: Game[] = []
      if (closedWeeks && closedWeeks.length > 0) {
        const closedWeekIds = (closedWeeks as any[]).map((w) => w.id)
        const { data: hGamesRaw } = await supabase
          .from('games')
          .select('*')
          .in('week_id', closedWeekIds)
          .eq('is_tiebreaker', false)
        historicalGames = (hGamesRaw ?? []).map((g: any) => {
          const wk = (closedWeeks as any[]).find((w) => w.id === g.week_id)
          return dbGameToMock(g, wk?.week_number ?? 1)
        })
      }
      if (cancelled) return
      setGames([...historicalGames, ...weekGames])

      // All picks (RLS handles visibility: own always, others only when week closed)
      const { data: picksRaw } = await supabase
        .from('picks')
        .select('user_id, game_id, week_id, picked_team, result, created_at')
      if (cancelled) return

      const allWeeks = [...(closedWeeks ?? []), ...(week ? [week] : [])] as any[]
      const weekIdToNum: Record<string, number> = {}
      for (const w of allWeeks) weekIdToNum[w.id] = w.week_number

      const entriesByKey: Record<string, { gmId: string; week: number; submittedAt: string; picks: Pick[] }> = {}
      for (const p of picksRaw ?? []) {
        const weekNum = weekIdToNum[p.week_id]
        if (!weekNum) continue
        const key = `${p.user_id}:${weekNum}`
        if (!entriesByKey[key]) {
          entriesByKey[key] = { gmId: p.user_id, week: weekNum, submittedAt: p.created_at, picks: [] }
        }
        entriesByKey[key].picks.push({ gameId: p.game_id, side: (p.picked_team === 'home' ? 'HOME' : 'AWAY') as PickSide })
      }
      setEntries(Object.values(entriesByKey))

      // Announcements + reactions + comments
      const { data: anns } = await supabase
        .from('announcements')
        .select('id, type, week_id, content, created_at')
        .order('created_at', { ascending: false })
        .limit(20)

      const annIds = (anns ?? []).map((a: any) => a.id)
      const [{ data: reactions }, { data: commentsRaw }] = await Promise.all([
        annIds.length > 0
          ? supabase.from('reactions').select('announcement_id, user_id, emoji').in('announcement_id', annIds).eq('emoji', '👍')
          : Promise.resolve({ data: [] as any[] }),
        annIds.length > 0
          ? supabase.from('comments').select('id, announcement_id, user_id, content, created_at').in('announcement_id', annIds).order('created_at')
          : Promise.resolve({ data: [] as any[] }),
      ])

      const weekLookup: Record<string, number> = { ...weekIdToNum }
      if (week) weekLookup[week.id] = week.week_number
      if (cancelled) return
      setFeed(
        (anns ?? []).map((a: any) =>
          dbAnnouncementToFeedItem(a, weekLookup[a.week_id] ?? null, reactions ?? [], commentsRaw ?? [])
        )
      )

      setLoading(false)
    }

    fetchAll()
    return () => { cancelled = true }
  }, [refreshKey])

  // ── Derived state ─────────────────────────────────────────────────────────────
  const currentWeek = activeWeek?.week_number ?? 1
  const weekLocked = activeWeek ? activeWeek.status !== 'open' : false

  const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const
  const day = DAY_NAMES[new Date().getDay()] as DayOfWeek
  const sim = { currentWeek, day }

  // ── Methods ───────────────────────────────────────────────────────────────────
  function myEntry(week: number): GMEntry | undefined {
    return entries.find((e) => e.gmId === youId && e.week === week)
  }

  function isSlatePublished(week: number): boolean {
    if (!activeWeek || activeWeek.week_number !== week) return false
    return activeWeek.status !== 'pending'
  }

  function getSlateStatus(week: number): SlateStatus {
    if (!activeWeek || activeWeek.week_number !== week) return 'DRAFT'
    if (activeWeek.status === 'pending') {
      return games.some((g) => g.week === week) ? 'REVIEW' : 'DRAFT'
    }
    return 'PUBLISHED'
  }

  function pickStatus(pick: Pick): { status: PickStatus; game: Game | undefined } {
    const game = games.find((g) => g.id === pick.gameId)
    if (!game || game.finalAtsWinnerTeamId === undefined) return { status: 'pending', game }
    if (game.finalAtsWinnerTeamId === null) return { status: 'push', game }
    const pickedId = pick.side === 'HOME' ? game.homeTeamId : game.awayTeamId
    return { status: pickedId === game.finalAtsWinnerTeamId ? 'win' : 'loss', game }
  }

  // ── Mutations ─────────────────────────────────────────────────────────────────
  async function submitMyPicks(_week: number, picks: Pick[]) {
    const results = await Promise.all(
      picks.map((p) =>
        fetch('/api/picks/upsert', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ gameId: p.gameId, pickedTeam: p.side === 'HOME' ? 'home' : 'away' }),
        })
      )
    )
    if (results.every((r) => r.ok)) refresh()
  }

  function toggleLike(feedId: string) {
    const supabase = createClient()
    const item = feed.find((f) => f.id === feedId)
    const already = item?.likes?.includes(youId)
    if (already) {
      supabase.from('reactions').delete().match({ announcement_id: feedId, user_id: youId, emoji: '👍' }).then(() => refresh())
    } else {
      supabase.from('reactions').insert({ announcement_id: feedId, user_id: youId, emoji: '👍' }).then(() => refresh())
    }
  }

  function addComment(feedId: string, body: string) {
    const supabase = createClient()
    supabase.from('comments').insert({ announcement_id: feedId, user_id: youId, content: body }).then(() => refresh())
  }

  async function pullLines(_week: number) {
    const { pullLinesAction } = await import('@/app/actions/league')
    if (!activeWeek) return
    await pullLinesAction(activeWeek.week_number, activeWeek.season_year)
    refresh()
  }

  async function updateSpread(gameId: string, spread: number) {
    const { updateSpreadAction } = await import('@/app/actions/league')
    await updateSpreadAction(gameId, spread)
    refresh()
  }

  async function publishSlate(_week: number, message: string) {
    const { publishSlateAction } = await import('@/app/actions/league')
    if (!activeWeek) return
    await publishSlateAction(activeWeek.id, message)
    refresh()
  }

  function postAnnouncement(title: string, body: string) {
    const supabase = createClient()
    if (!activeWeek) return
    supabase.from('announcements').insert({
      week_id: activeWeek.id,
      author_id: youId,
      type: 'general',
      content: body || title,
    }).then(() => refresh())
  }

  const value: LeagueState = {
    loading,
    games,
    entries,
    feed,
    gms,
    youId,
    isCommissioner,
    weekLocked,
    activeWeek,
    sim,
    myEntry,
    isSlatePublished,
    getSlateStatus,
    pickStatus,
    submitMyPicks,
    toggleLike,
    addComment,
    pullLines,
    updateSpread,
    publishSlate,
    postAnnouncement,
    refresh,
  }

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}
