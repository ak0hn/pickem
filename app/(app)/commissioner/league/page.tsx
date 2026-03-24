import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { InvitePlayerForm, FetchHoursSetting, PushCountsAsSetting } from '@/components/LeagueActions'

export default async function LeaguePage() {
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

  const [{ data: players }, { data: invites }, { data: leagueSettings }] = await Promise.all([
    db.from('users').select('id, name, email, created_at').eq('role', 'player').order('name'),
    db.from('invites').select('id, email, accepted_at, created_at').order('created_at', { ascending: false }),
    db.from('league').select('*').limit(1).maybeSingle(),
  ])

  return (
    <div className="p-4 space-y-6">
      {/* Header with back nav */}
      <div className="flex items-center gap-3">
        <Link href="/commissioner" className="text-gray-400 active:text-white transition-colors">
          ‹ Commissioner
        </Link>
      </div>
      <h1 className="text-2xl font-bold text-white -mt-2">League</h1>

      {/* ── Players ─────────────────────────────────────────── */}
      <section className="space-y-3">
        <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-widest">
          Players ({players?.length ?? 0})
        </h2>
        <div className="bg-gray-900 border border-gray-800 rounded-xl divide-y divide-gray-800">
          {(players ?? []).length === 0 ? (
            <p className="px-4 py-3 text-sm text-gray-600">No players yet.</p>
          ) : (
            (players ?? []).map((player) => (
              <div key={player.id} className="flex items-center justify-between px-4 py-3">
                <span className="text-sm text-white">{player.name}</span>
                <span className="text-xs text-gray-500">{player.email}</span>
              </div>
            ))
          )}
        </div>
      </section>

      {/* ── Invite ──────────────────────────────────────────── */}
      <section className="space-y-3">
        <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-widest">
          Invite player
        </h2>
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 space-y-3">
          <InvitePlayerForm />
        </div>

        {/* Pending invites */}
        {(invites ?? []).filter((i) => !i.accepted_at).length > 0 && (
          <div className="bg-gray-900 border border-gray-800 rounded-xl divide-y divide-gray-800">
            <div className="px-4 py-2">
              <span className="text-xs text-gray-500">Pending invites</span>
            </div>
            {(invites ?? [])
              .filter((i) => !i.accepted_at)
              .map((invite) => (
                <div key={invite.id} className="flex items-center justify-between px-4 py-3">
                  <span className="text-sm text-gray-300">{invite.email}</span>
                  <span className="text-xs text-yellow-500">Pending</span>
                </div>
              ))}
          </div>
        )}
      </section>

      {/* ── League Settings ──────────────────────────────────── */}
      <section className="space-y-3">
        <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-widest">
          Settings
        </h2>
        <div className="bg-gray-900 border border-gray-800 rounded-xl divide-y divide-gray-800">
          {/* Auto-publish toggle — live and interactive */}
          <FetchHoursSetting current={leagueSettings?.fetch_hours_before_kickoff ?? 12} />
          <PushCountsAsSetting current={(leagueSettings?.push_counts_as as 'win' | 'tie') ?? 'tie'} />

          {[
            ['League name', leagueSettings?.name ?? '—'],
            ['Season', leagueSettings?.season_year ?? '—'],
            ['Picks per week', leagueSettings?.pick_count ?? '—'],
            ['Weekly prize', leagueSettings?.weekly_prize_display ?? '—'],
            ['Season prize', leagueSettings?.season_prize_display ?? '—'],
            ['MNF tiebreaker threshold', leagueSettings?.tiebreaker_threshold ?? '—'],
          ].map(([label, value]) => (
            <div key={label as string} className="flex items-center justify-between px-4 py-3">
              <span className="text-sm text-gray-300">{label}</span>
              <span className="text-sm text-gray-500">{String(value)}</span>
            </div>
          ))}
        </div>
        <p className="text-xs text-gray-600 px-1">
          Other settings editing coming soon.
        </p>
      </section>
    </div>
  )
}
