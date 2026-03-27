import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import SubmissionTracker from '@/components/SubmissionTracker'
import {
  FetchScheduleButton,
  FetchResultsButton,
  FetchMNFLineButton,
  FetchMNFResultButton,
  ResultsAnnouncementForm,
  TiebreakerAnnouncementForm,
  TiebreakerResultsForm,
  AnnouncementForm,
  CloseWeekButton,
  DevResetButton,
} from '@/components/CommissionerActions'
import SlateReview from '@/components/SlateReview'

export default async function CommissionerPage() {
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

  // Active week
  const { data: weeks } = await db
    .from('weeks')
    .select('*')
    .order('week_number', { ascending: false })
    .limit(5)

  const activeWeek = (weeks ?? []).find((w) => w.status !== 'closed') ?? weeks?.[0] ?? null
  const currentYear = new Date().getFullYear()
  const nextWeekNumber = activeWeek
    ? activeWeek.status === 'closed' ? activeWeek.week_number + 1 : activeWeek.week_number
    : 1

  const status = activeWeek?.status ?? null

  // Sunday games (non-tiebreaker)
  const { data: games } = activeWeek
    ? await db
        .from('games')
        .select('*')
        .eq('week_id', activeWeek.id)
        .eq('is_tiebreaker', false)
        .order('kickoff_time', { ascending: true })
    : { data: [] }

  const hasGames = (games ?? []).length > 0

  // Perfect scorers (needed for sunday_complete + tiebreaker states)
  let perfectCount = 0
  let eligiblePlayers: Array<{ id: string; name: string }> = []
  let threshold = 1

  if (status === 'sunday_complete' || status === 'tiebreaker') {
    const gameIds = (games ?? []).map((g: any) => g.id)

    const { data: picks } = await db
      .from('picks')
      .select('user_id, result')
      .in('game_id', gameIds)

    const byUser: Record<string, string[]> = {}
    for (const p of picks ?? []) {
      if (!byUser[p.user_id]) byUser[p.user_id] = []
      byUser[p.user_id].push(p.result)
    }

    const perfectUserIds = Object.entries(byUser)
      .filter(([, results]) => results.length > 0 && results.every((r) => r === 'win'))
      .map(([id]) => id)

    perfectCount = perfectUserIds.length

    if (perfectUserIds.length > 0) {
      const { data: eligibles } = await db
        .from('users')
        .select('id, name')
        .in('id', perfectUserIds)
      eligiblePlayers = eligibles ?? []
    }

    const { data: league } = await db
      .from('league')
      .select('tiebreaker_threshold')
      .limit(1)
      .maybeSingle()
    threshold = league?.tiebreaker_threshold ?? 1
  }

  // Tiebreaker game + pick state (tiebreaker status only)
  let tiebreakerGame: any = null
  let tiebreakerPicksOpen = false
  let mnfResultConfirmed = false
  let tiebreakerPickCount = 0

  if (status === 'tiebreaker') {
    const { data: tbGame } = await db
      .from('games')
      .select('*')
      .eq('week_id', activeWeek.id)
      .eq('is_tiebreaker', true)
      .maybeSingle()

    tiebreakerGame = tbGame ?? null

    if (tiebreakerGame) {
      mnfResultConfirmed = tiebreakerGame.result_confirmed === true

      const { data: tbAnnouncement } = await db
        .from('announcements')
        .select('id')
        .eq('week_id', activeWeek.id)
        .eq('type', 'tiebreaker')
        .maybeSingle()

      tiebreakerPicksOpen = !!tbAnnouncement

      if (tiebreakerPicksOpen) {
        const { data: tbPicks } = await db
          .from('picks')
          .select('user_id')
          .eq('game_id', tiebreakerGame.id)

        tiebreakerPickCount = new Set((tbPicks ?? []).map((p: any) => p.user_id)).size
      }
    }
  }

  return (
    <div className="p-4 space-y-6">
      <h1 className="text-2xl font-bold text-white">Commissioner</h1>

      {/* ── Weekly workflow ───────────────────────────────── */}
      <section className="space-y-3">

        {/* STATE: No active week → start new */}
        {(!activeWeek || status === 'closed') && (
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-white">Week {nextWeekNumber}</span>
              <span className="text-xs text-gray-500 bg-gray-800 px-2 py-0.5 rounded-full">Not started</span>
            </div>
            <p className="text-xs text-gray-500">
              Post this week's matchups so players can see the schedule.
              {process.env.MOCK_ODDS === 'true' && <span className="ml-1 text-yellow-500">Mock mode on</span>}
            </p>
            <FetchScheduleButton weekNumber={nextWeekNumber} seasonYear={currentYear} />
          </div>
        )}

        {/* STATE: pending, no games (shouldn't normally happen — schedule should pre-exist) */}
        {status === 'pending' && !hasGames && (
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 space-y-3">
            <span className="text-sm font-semibold text-white">Week {activeWeek.week_number}</span>
            <p className="text-xs text-gray-500">No matchups yet. Fetch the schedule to post the slate.</p>
            <FetchScheduleButton
              weekNumber={activeWeek.week_number}
              seasonYear={activeWeek.season_year}
            />
          </div>
        )}

        {/* STATE: open → tracker + pre-SNF + fetch results */}
        {status === 'open' && (
          <>
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-white">Week {activeWeek.week_number} — Live</span>
                <span className="text-xs text-green-400 bg-green-400/10 px-2 py-0.5 rounded-full">Picks open</span>
              </div>
              <SubmissionTracker weekId={activeWeek.id} />
            </div>

            {/* Pre-SNF update */}
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 space-y-3">
              <div>
                <span className="text-sm font-semibold text-white">Pre-SNF update</span>
                <p className="text-xs text-gray-500 mt-0.5">
                  Who's still perfect? Who's already out? Build the tension before Sunday Night Football.
                </p>
              </div>
              <AnnouncementForm
                weekId={activeWeek.id}
                placeholder="After the afternoon games — who's still alive heading into SNF?"
                type="pre_snf_update"
                label="Post pre-SNF update →"
              />
            </div>

            {/* Fetch results — shown after SNF ends */}
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 space-y-3">
              <div>
                <span className="text-sm font-semibold text-white">Ready to close out the week?</span>
                <p className="text-xs text-gray-500 mt-0.5">
                  Run this after SNF ends to pull final scores and score all picks automatically.
                </p>
              </div>
              <FetchResultsButton weekId={activeWeek.id} />
            </div>
          </>
        )}

        {/* STATE: sunday_complete → results scored, write announcement */}
        {status === 'sunday_complete' && (
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-white">Week {activeWeek.week_number} — Results in</span>
              <span className="text-xs text-orange-400 bg-orange-400/10 px-2 py-0.5 rounded-full">
                Pending announcement
              </span>
            </div>

            {/* Perfect scorers summary */}
            <div className="space-y-1">
              <p className="text-xs text-gray-400">
                {perfectCount === 0
                  ? 'No perfect scores this week.'
                  : perfectCount === 1
                  ? '1 perfect score:'
                  : `${perfectCount} perfect scores:`}
              </p>
              {eligiblePlayers.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {eligiblePlayers.map((p) => (
                    <span key={p.id} className="text-xs bg-gray-800 text-white px-2 py-0.5 rounded-full">
                      {p.name}
                    </span>
                  ))}
                </div>
              )}
              {perfectCount > threshold && (
                <p className="text-xs text-yellow-500 mt-1">
                  Threshold is {threshold} — tiebreaker will trigger when you post.
                </p>
              )}
            </div>

            <div className="border-t border-gray-800 pt-3 space-y-2">
              <p className="text-xs text-gray-500">
                Write your results post. This goes to the feed and officially closes the week
                {perfectCount > threshold ? ' (or kicks off the tiebreaker).' : '.'}
              </p>
              <ResultsAnnouncementForm
                weekId={activeWeek.id}
                perfectCount={perfectCount}
                threshold={threshold}
              />
            </div>
          </div>
        )}

        {/* STATE: tiebreaker */}
        {status === 'tiebreaker' && (
          <>
            {/* Sub-phase 1: no MNF game yet → fetch it */}
            {!tiebreakerGame && (
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-white">MNF Tiebreaker</span>
                  <span className="text-xs text-yellow-400 bg-yellow-400/10 px-2 py-0.5 rounded-full">
                    Needs MNF line
                  </span>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-gray-400">
                    {perfectCount} players are still perfect:
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {eligiblePlayers.map((p) => (
                      <span key={p.id} className="text-xs bg-gray-800 text-white px-2 py-0.5 rounded-full">
                        {p.name}
                      </span>
                    ))}
                  </div>
                </div>
                <p className="text-xs text-gray-500">
                  Fetch the Monday Night Football line. You'll review it before opening picks.
                </p>
                <FetchMNFLineButton weekId={activeWeek.id} />
              </div>
            )}

            {/* Sub-phase 2: MNF game fetched, picks not open yet → review + post tiebreaker announcement */}
            {tiebreakerGame && !tiebreakerPicksOpen && !mnfResultConfirmed && (
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-white">MNF Tiebreaker — Review line</span>
                  <span className="text-xs text-yellow-400 bg-yellow-400/10 px-2 py-0.5 rounded-full">
                    Line fetched
                  </span>
                </div>

                {/* MNF game preview */}
                <SlateReview
                  weekId={activeWeek.id}
                  weekNumber={activeWeek.week_number}
                  games={[tiebreakerGame] as any}
                />

                {/* Eligible players */}
                <div className="space-y-1">
                  <p className="text-xs text-gray-400">Eligible to pick ({eligiblePlayers.length}):</p>
                  <div className="flex flex-wrap gap-1.5">
                    {eligiblePlayers.map((p) => (
                      <span key={p.id} className="text-xs bg-gray-800 text-white px-2 py-0.5 rounded-full">
                        {p.name}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="border-t border-gray-800 pt-3 space-y-2">
                  <p className="text-xs text-gray-500">
                    Write your tiebreaker post. This goes to the feed and opens MNF picks for eligible players.
                  </p>
                  <TiebreakerAnnouncementForm
                    weekId={activeWeek.id}
                    eligibleNames={eligiblePlayers.map((p) => p.name)}
                  />
                </div>
              </div>
            )}

            {/* Sub-phase 3: picks open, result not yet fetched → tracker + fetch result */}
            {tiebreakerGame && tiebreakerPicksOpen && !mnfResultConfirmed && (
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-white">MNF Tiebreaker — Picks live</span>
                  <span className="text-xs text-blue-400 bg-blue-400/10 px-2 py-0.5 rounded-full">
                    Picks open
                  </span>
                </div>

                {/* Pick submission progress */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span>Tiebreaker picks submitted</span>
                    <span>{tiebreakerPickCount} / {eligiblePlayers.length}</span>
                  </div>
                  <div className="w-full bg-gray-800 rounded-full h-1.5">
                    <div
                      className="bg-blue-500 h-1.5 rounded-full transition-all"
                      style={{
                        width: eligiblePlayers.length > 0
                          ? `${Math.round((tiebreakerPickCount / eligiblePlayers.length) * 100)}%`
                          : '0%'
                      }}
                    />
                  </div>
                  {tiebreakerPickCount === eligiblePlayers.length && eligiblePlayers.length > 0 && (
                    <p className="text-xs text-green-400">All eligible players have picked.</p>
                  )}
                </div>

                <div className="border-t border-gray-800 pt-3 space-y-2">
                  <p className="text-xs text-gray-500">
                    Run this after MNF ends to pull the final score and score tiebreaker picks automatically.
                  </p>
                  <FetchMNFResultButton weekId={activeWeek.id} />
                </div>
              </div>
            )}

            {/* Sub-phase 4: result confirmed → write tiebreaker results announcement */}
            {tiebreakerGame && mnfResultConfirmed && (
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-white">MNF Tiebreaker — Result in</span>
                  <span className="text-xs text-orange-400 bg-orange-400/10 px-2 py-0.5 rounded-full">
                    Pending announcement
                  </span>
                </div>
                <p className="text-xs text-gray-500">
                  Write your tiebreaker results post. This closes the week officially.
                </p>
                <TiebreakerResultsForm weekId={activeWeek.id} />
              </div>
            )}
          </>
        )}

        {/* STATE: results_posted → close week */}
        {status === 'results_posted' && (
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-white">Week {activeWeek.week_number} — Results posted</span>
              <span className="text-xs text-blue-400 bg-blue-400/10 px-2 py-0.5 rounded-full">Results live</span>
            </div>
            <p className="text-xs text-gray-500">Standings are updated. Close the week when everything looks good.</p>
            <CloseWeekButton weekId={activeWeek.id} />
          </div>
        )}
      </section>

      {/* ── Full slate (always visible once games exist) ── */}
      {hasGames && activeWeek && (
        <section className="space-y-3">
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-widest">This week's slate</h2>
          <SlateReview
            weekId={activeWeek.id}
            weekNumber={activeWeek.week_number}
            seasonYear={status === 'pending' ? activeWeek.season_year : undefined}
            games={(games ?? []) as any}
            readOnly={status !== 'pending'}
          />
        </section>
      )}

      {/* ── General feed post ─────────────────────────────── */}
      <section className="space-y-3">
        <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-widest">Post to feed</h2>
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
          <AnnouncementForm
            weekId={activeWeek?.id ?? null}
            placeholder="Share something with the league…"
            type="general"
            label="Post to feed →"
          />
        </div>
      </section>

      {/* ── Dev tools ─────────────────────────────────────── */}
      {process.env.MOCK_ODDS === 'true' && activeWeek && (
        <section className="space-y-3">
          <h2 className="text-xs font-semibold text-yellow-600 uppercase tracking-widest">Dev tools</h2>
          <div className="bg-yellow-950/30 border border-yellow-900/50 rounded-xl p-4 space-y-2">
            <p className="text-xs text-yellow-700">Mock mode — not visible in production.</p>
            <DevResetButton weekId={activeWeek.id} seasonYear={activeWeek.season_year} />
          </div>
        </section>
      )}

      {/* ── League management ─────────────────────────────── */}
      <section className="space-y-3">
        <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-widest">League</h2>
        <Link
          href="/commissioner/league"
          className="flex items-center justify-between bg-gray-900 border border-gray-800 rounded-xl px-4 py-3.5 active:bg-gray-800 transition-colors"
        >
          <span className="text-sm text-white font-medium">Players, invites & settings</span>
          <span className="text-gray-600">›</span>
        </Link>
      </section>
    </div>
  )
}
