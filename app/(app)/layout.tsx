import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/server'
import BottomNav from '@/components/BottomNav'
import AppHeader from '@/components/AppHeader'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const db = createServiceClient()

  const [{ data: profile }, { data: activeWeek }, { data: leagueSettings }] = await Promise.all([
    db.from('users').select('role').eq('id', user.id).maybeSingle(),
    db.from('weeks').select('id, week_number, status')
      .not('status', 'eq', 'closed')
      .order('week_number', { ascending: false })
      .limit(1)
      .maybeSingle(),
    db.from('league').select('pick_count').limit(1).maybeSingle(),
  ])

  const isCommissioner = profile?.role === 'commissioner'
  const pickCount: number = leagueSettings?.pick_count ?? 6

  // Fetch user's locked picks for the active week to show in the header
  type LockedPick = { teamName: string; spread: string | null }
  let lockedPicks: LockedPick[] = []
  if (activeWeek?.id) {
    const { data: gamesRaw } = await db
      .from('games')
      .select('id, home_team, away_team, spread, spread_favorite')
      .eq('week_id', activeWeek.id)
      .eq('is_tiebreaker', false)

    const games = gamesRaw ?? []
    const gameIds = games.map((g: any) => g.id)

    if (gameIds.length > 0) {
      const { data: picksRaw } = await db
        .from('picks')
        .select('picked_team, game_id')
        .eq('user_id', user.id)
        .in('game_id', gameIds)

      const gameMap = new Map(games.map((g: any) => [g.id, g]))
      lockedPicks = (picksRaw ?? []).map((pick: any) => {
        const game = gameMap.get(pick.game_id) as any
        if (!game) return null
        const team = pick.picked_team === 'home' ? game.home_team : game.away_team
        const spread = game.spread && game.spread !== 0
          ? (game.spread_favorite === pick.picked_team ? `-${game.spread}` : `+${game.spread}`)
          : null
        return { teamName: team, spread }
      }).filter(Boolean) as LockedPick[]
    }
  }

  return (
    <div className="min-h-screen flex flex-col max-w-lg mx-auto">
      <AppHeader
        weekNumber={activeWeek?.week_number ?? null}
        weekStatus={activeWeek?.status ?? null}
        lockedPicks={lockedPicks}
        pickCount={pickCount}
        hasActiveWeek={!!activeWeek}
      />
      <main className="flex-1 pb-20">
        {children}
      </main>
      <BottomNav isCommissioner={isCommissioner} />
    </div>
  )
}
