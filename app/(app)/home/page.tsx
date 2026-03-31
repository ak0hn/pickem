import { createClient, createServiceClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import AnnouncementCard from '@/components/AnnouncementCard'

export default async function FeedPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const db = createServiceClient()

  const { data: profile } = await db.from('users').select('role').eq('id', user.id).maybeSingle()
  const isCommissioner = profile?.role === 'commissioner'

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
    .select('id, type, week_id, content, created_at, author:author_id(name), week:week_id(week_number)')
    .order('created_at', { ascending: false })
    .limit(10)

  const announcementIds = (announcements ?? []).map((a: any) => a.id)

  // Reactions + comment counts for feed cards
  const [{ data: reactions }, { data: commentRows }] = await Promise.all([
    announcementIds.length > 0
      ? db.from('reactions').select('announcement_id, user_id, emoji').in('announcement_id', announcementIds).eq('emoji', '👍')
      : { data: [] },
    announcementIds.length > 0
      ? db.from('comments').select('announcement_id').in('announcement_id', announcementIds)
      : { data: [] },
  ])

  const likeCounts: Record<string, number> = {}
  const myLikes = new Set<string>()
  for (const r of reactions ?? []) {
    likeCounts[r.announcement_id] = (likeCounts[r.announcement_id] ?? 0) + 1
    if (r.user_id === user.id) myLikes.add(r.announcement_id)
  }

  const commentCounts: Record<string, number> = {}
  for (const c of commentRows ?? []) {
    commentCounts[c.announcement_id] = (commentCounts[c.announcement_id] ?? 0) + 1
  }

  const pct = totalPlayers > 0 ? Math.round((submittedCount / totalPlayers) * 100) : 0

  return (
    <div className="px-4 pt-4 pb-4 space-y-3">
      {/* Submission bar — picks open state */}
      {week?.status === 'open' && (
        <div className="flex items-center gap-2">
          <div className="flex-1 bg-gray-800 rounded-full h-1">
            <div className="bg-green-500 h-1 rounded-full transition-all" style={{ width: `${pct}%` }} />
          </div>
          <span className="text-xs text-gray-500 shrink-0">{submittedCount}/{totalPlayers} picked</span>
        </div>
      )}

      {/* ── Announcements feed ──────────────────────────── */}
      <div className="space-y-3">
        {(announcements ?? []).length === 0 ? (
          <p className="text-sm text-gray-600 text-center py-8">Nothing posted yet.</p>
        ) : (
          (announcements ?? []).map((a: any) => (
            <AnnouncementCard
              key={a.id}
              id={a.id}
              type={a.type}
              weekId={a.week_id ?? null}
              weekNumber={a.week?.week_number ?? null}
              content={a.content}
              createdAt={a.created_at}
              isCommissioner={isCommissioner}
              likeCount={likeCounts[a.id] ?? 0}
              hasLiked={myLikes.has(a.id)}
              commentCount={commentCounts[a.id] ?? 0}
            />
          ))
        )}
      </div>
    </div>
  )
}
