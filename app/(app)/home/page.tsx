import { createClient, createServiceClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function FeedPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const db = createServiceClient()

  // Current active week
  const { data: weeks } = await db
    .from('weeks')
    .select('*')
    .in('status', ['open', 'sunday_complete', 'tiebreaker', 'results_posted'])
    .order('week_number', { ascending: false })
    .limit(1)

  const week = weeks?.[0] ?? null

  // Submission stats if week is live
  let submittedCount = 0
  let totalPlayers = 0

  if (week) {
    const { count } = await db
      .from('users')
      .select('*', { count: 'exact', head: true })
      .eq('role', 'player')
    totalPlayers = count ?? 0

    const { data: picksRaw } = await db
      .from('picks')
      .select('user_id')
      .eq('week_id', week.id)
    submittedCount = new Set((picksRaw ?? []).map((p: any) => p.user_id)).size
  }

  // Recent announcements
  const { data: announcements } = await db
    .from('announcements')
    .select('id, type, content, created_at, author:author_id(name)')
    .order('created_at', { ascending: false })
    .limit(10)

  const pct = totalPlayers > 0 ? Math.round((submittedCount / totalPlayers) * 100) : 0

  const statusLabel: Record<string, string> = {
    open: 'Picks open',
    sunday_complete: 'Games in progress',
    tiebreaker: 'Tiebreaker',
    results_posted: 'Results posted',
  }

  return (
    <div className="p-4 space-y-5">
      <h1 className="text-2xl font-bold text-white">Feed</h1>

      {/* ── This Week tile ──────────────────────────────── */}
      {week ? (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-white">Week {week.week_number}</span>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
              week.status === 'open'
                ? 'text-green-400 bg-green-400/10'
                : week.status === 'results_posted'
                ? 'text-blue-400 bg-blue-400/10'
                : 'text-orange-400 bg-orange-400/10'
            }`}>
              {statusLabel[week.status] ?? week.status}
            </span>
          </div>

          {/* Submission bar */}
          {week.status === 'open' && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs text-gray-500">
                <span>{submittedCount} of {totalPlayers} players have picked</span>
                <span>{pct}%</span>
              </div>
              <div className="w-full bg-gray-800 rounded-full h-1.5">
                <div
                  className="bg-blue-500 h-1.5 rounded-full transition-all"
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          )}

          {week.status === 'results_posted' && (
            <p className="text-xs text-gray-500">Results are in — check the standings.</p>
          )}
        </div>
      ) : (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
          <p className="text-sm text-gray-500">No active week. Check back Thursday.</p>
        </div>
      )}

      {/* ── Announcements feed ──────────────────────────── */}
      <div className="space-y-3">
        {(announcements ?? []).length === 0 ? (
          <p className="text-sm text-gray-600 text-center py-8">Nothing posted yet.</p>
        ) : (
          (announcements ?? []).map((a: any) => (
            <div key={a.id} className="bg-gray-900 border border-gray-800 rounded-xl p-4 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-gray-400">
                  {a.author?.name ?? 'Commissioner'}
                </span>
                <span className="text-xs text-gray-600">
                  {new Date(a.created_at).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                  })}
                </span>
              </div>
              <p className="text-sm text-white leading-relaxed">{a.content}</p>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
