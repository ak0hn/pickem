import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient, createServiceClient } from '@/lib/supabase/server'

const STATUS_LABEL: Record<string, { label: string; color: string }> = {
  pending:        { label: 'Pending',   color: 'text-gray-500 bg-gray-800' },
  open:           { label: 'Live',      color: 'text-green-400 bg-green-400/10' },
  sunday_complete:{ label: 'Scoring',   color: 'text-orange-400 bg-orange-400/10' },
  tiebreaker:     { label: 'Tiebreaker',color: 'text-yellow-400 bg-yellow-400/10' },
  results_posted: { label: 'Wrapped',   color: 'text-blue-400 bg-blue-400/10' },
  closed:         { label: 'Closed',    color: 'text-gray-600 bg-gray-800' },
}

export default async function WeeksPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const db = createServiceClient()

  const { data: profile } = await db
    .from('users')
    .select('role')
    .eq('id', user.id)
    .maybeSingle()

  if (profile?.role !== 'commissioner') redirect('/home')

  const { data: weeks } = await db
    .from('weeks')
    .select('id, week_number, season_year, status')
    .order('week_number', { ascending: false })

  // For each week, count perfect scorers
  const weekIds = (weeks ?? []).map((w) => w.id)

  const { data: allGames } = weekIds.length > 0
    ? await db.from('games').select('id, week_id').in('week_id', weekIds).eq('is_tiebreaker', false)
    : { data: [] }

  const gamesByWeek: Record<string, string[]> = {}
  for (const g of allGames ?? []) {
    if (!gamesByWeek[g.week_id]) gamesByWeek[g.week_id] = []
    gamesByWeek[g.week_id].push(g.id)
  }

  const allGameIds = (allGames ?? []).map((g) => g.id)
  const { data: allPicks } = allGameIds.length > 0
    ? await db.from('picks').select('user_id, game_id, result').in('game_id', allGameIds)
    : { data: [] }

  // Perfect scorers per week
  const perfectByWeek: Record<string, number> = {}
  for (const [weekId, gameIds] of Object.entries(gamesByWeek)) {
    const weekPicks = (allPicks ?? []).filter((p) => gameIds.includes(p.game_id))
    const byUser: Record<string, string[]> = {}
    for (const p of weekPicks) {
      if (!byUser[p.user_id]) byUser[p.user_id] = []
      byUser[p.user_id].push(p.result)
    }
    perfectByWeek[weekId] = Object.values(byUser).filter(
      (results) => results.length > 0 && results.every((r) => r === 'win')
    ).length
  }

  return (
    <div className="p-4 space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/commissioner" className="text-gray-400 active:text-white transition-colors text-sm">
          ‹ Commissioner
        </Link>
      </div>
      <h1 className="text-2xl font-bold text-white -mt-2">Past weeks</h1>

      {(weeks ?? []).length === 0 && (
        <p className="text-sm text-gray-600">No weeks yet.</p>
      )}

      <div className="bg-gray-900 border border-gray-800 rounded-xl divide-y divide-gray-800">
        {(weeks ?? []).map((week) => {
          const badge = STATUS_LABEL[week.status] ?? STATUS_LABEL.closed
          const perfect = perfectByWeek[week.id] ?? 0
          const hasResults = ['sunday_complete', 'tiebreaker', 'results_posted', 'closed'].includes(week.status)

          return (
            <Link
              key={week.id}
              href={`/commissioner/weeks/${week.week_number}`}
              className="flex items-center justify-between px-4 py-3.5 active:bg-gray-800 transition-colors"
            >
              <div className="space-y-0.5">
                <span className="text-sm text-white font-medium">Week {week.week_number}</span>
                {hasResults && (
                  <p className="text-xs text-gray-500">
                    {perfect === 0 ? 'No perfect scores' : `${perfect} perfect score${perfect > 1 ? 's' : ''}`}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${badge.color}`}>
                  {badge.label}
                </span>
                <span className="text-gray-600">›</span>
              </div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
