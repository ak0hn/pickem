import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import SlateReview from '@/components/SlateReview'

export default async function WeekDetailPage({
  params,
}: {
  params: Promise<{ weekNumber: string }>
}) {
  const { weekNumber: weekNumberStr } = await params
  const weekNumber = parseInt(weekNumberStr, 10)

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

  const { data: week } = await db
    .from('weeks')
    .select('*')
    .eq('week_number', weekNumber)
    .maybeSingle()

  if (!week) redirect('/commissioner/weeks')

  const { data: games } = await db
    .from('games')
    .select('*')
    .eq('week_id', week.id)
    .eq('is_tiebreaker', false)
    .order('kickoff_time', { ascending: true })

  // Perfect scorers
  const gameIds = (games ?? []).map((g: any) => g.id)
  const { data: picks } = gameIds.length > 0
    ? await db.from('picks').select('user_id, result').in('game_id', gameIds)
    : { data: [] }

  const byUser: Record<string, string[]> = {}
  for (const p of picks ?? []) {
    if (!byUser[p.user_id]) byUser[p.user_id] = []
    byUser[p.user_id].push(p.result)
  }

  const perfectUserIds = Object.entries(byUser)
    .filter(([, results]) => results.length > 0 && results.every((r) => r === 'win'))
    .map(([id]) => id)

  const { data: winners } = perfectUserIds.length > 0
    ? await db.from('users').select('id, name').in('id', perfectUserIds)
    : { data: [] }

  const hasResults = ['sunday_complete', 'tiebreaker', 'results_posted', 'closed'].includes(week.status)
  const totalSubmitted = Object.keys(byUser).length

  return (
    <div className="p-4 space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/commissioner/weeks" className="text-gray-400 active:text-white transition-colors text-sm">
          ‹ Past weeks
        </Link>
      </div>
      <h1 className="text-2xl font-bold text-white -mt-2">Week {weekNumber}</h1>

      {/* Winners */}
      {hasResults && (
        <section className="space-y-3">
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-widest">
            {(winners ?? []).length === 0 ? 'No perfect scores' : `Perfect scores (${(winners ?? []).length})`}
          </h2>
          {(winners ?? []).length > 0 && (
            <div className="flex flex-wrap gap-2">
              {(winners ?? []).map((w) => (
                <Link
                  key={w.id}
                  href={`/commissioner/player/${w.id}?week=${weekNumber}`}
                  className="text-sm bg-gray-900 border border-gray-800 text-white px-3 py-1.5 rounded-xl active:bg-gray-800 transition-colors"
                >
                  {w.name} ›
                </Link>
              ))}
            </div>
          )}
          {totalSubmitted > 0 && (
            <p className="text-xs text-gray-600">{totalSubmitted} player{totalSubmitted !== 1 ? 's' : ''} submitted picks</p>
          )}
        </section>
      )}

      {/* Slate */}
      {(games ?? []).length > 0 && (
        <section className="space-y-3">
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-widest">Slate</h2>
          <SlateReview
            weekId={week.id}
            weekNumber={weekNumber}
            games={(games ?? []) as any}
            readOnly={true}
          />
        </section>
      )}

      {(games ?? []).length === 0 && (
        <p className="text-sm text-gray-600">No games found for this week.</p>
      )}
    </div>
  )
}
