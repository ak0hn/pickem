import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import SubmissionTracker from '@/components/SubmissionTracker'
import {
  FetchLinesButton,
  PostResultsForm,
  CloseWeekButton,
  AnnouncementForm,
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

  // Fetch the most recent week (any non-closed status, or most recent closed)
  const { data: weeks } = await db
    .from('weeks')
    .select('*')
    .order('week_number', { ascending: false })
    .limit(5)

  const activeWeek = (weeks ?? []).find((w) => w.status !== 'closed') ?? weeks?.[0] ?? null

  // Current season year (from league settings or derive from date)
  const currentYear = new Date().getFullYear()
  const nextWeekNumber = activeWeek
    ? activeWeek.status === 'closed'
      ? activeWeek.week_number + 1
      : activeWeek.week_number
    : 1

  // Fetch games for active week
  const { data: games } = activeWeek
    ? await db
        .from('games')
        .select('*')
        .eq('week_id', activeWeek.id)
        .eq('is_tiebreaker', false)
        .order('kickoff_time', { ascending: true })
    : { data: [] }

  const hasGames = (games ?? []).length > 0
  const status = activeWeek?.status ?? null

  return (
    <div className="p-4 space-y-6">
      <h1 className="text-2xl font-bold text-white">Commissioner</h1>

      {/* ── Weekly actions ────────────────────────────────── */}
      <section className="space-y-3">

        {/* STATE: No active week or just closed → start new week */}
        {(!activeWeek || status === 'closed') && (
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-white">
                Week {nextWeekNumber}
              </span>
              <span className="text-xs text-gray-500 bg-gray-800 px-2 py-0.5 rounded-full">
                Not started
              </span>
            </div>
            <p className="text-xs text-gray-500">
              Fetch this week's lines from The Odds API to start the week.
              {process.env.MOCK_ODDS === 'true' && (
                <span className="ml-1 text-yellow-500">Mock mode on</span>
              )}
            </p>
            <FetchLinesButton weekNumber={nextWeekNumber} seasonYear={currentYear} />
          </div>
        )}

        {/* STATE: Pending — games fetched, not yet published */}
        {status === 'pending' && hasGames && (
          <SlateReview
            weekId={activeWeek.id}
            weekNumber={activeWeek.week_number}
            games={(games ?? []) as any}
          />
        )}

        {/* STATE: Pending — no games yet (fetch didn't run or failed) */}
        {status === 'pending' && !hasGames && (
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 space-y-3">
            <span className="text-sm font-semibold text-white">
              Week {activeWeek.week_number}
            </span>
            <p className="text-xs text-gray-500">
              Week created but no games found. Try fetching lines again.
            </p>
            <FetchLinesButton
              weekNumber={activeWeek.week_number}
              seasonYear={activeWeek.season_year}
            />
          </div>
        )}

        {/* STATE: Open — picks live */}
        {status === 'open' && (
          <>
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-white">
                  Week {activeWeek.week_number} — Live
                </span>
                <span className="text-xs text-green-400 bg-green-400/10 px-2 py-0.5 rounded-full">
                  Picks open
                </span>
              </div>
              <SubmissionTracker weekId={activeWeek.id} />
            </div>

            {hasGames && (
              <SlateReview
                weekId={activeWeek.id}
                weekNumber={activeWeek.week_number}
                games={(games ?? []) as any}
                readOnly
              />
            )}

            <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 space-y-3">
              <span className="text-sm font-semibold text-white">Pre-SNF update</span>
              <p className="text-xs text-gray-500">
                Hype up the group before Sunday Night Football.
              </p>
              <AnnouncementForm
                weekId={activeWeek.id}
                placeholder="Who's still perfect heading into SNF? Build the tension…"
                type="pre_snf_update"
                label="Post pre-SNF update →"
              />
            </div>
          </>
        )}

        {/* STATE: Sunday complete / tiebreaker — post results */}
        {(status === 'sunday_complete' || status === 'tiebreaker') && (
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-white">
                Week {activeWeek.week_number} — Post results
              </span>
              <span className="text-xs text-orange-400 bg-orange-400/10 px-2 py-0.5 rounded-full">
                Games done
              </span>
            </div>
            <p className="text-xs text-gray-500">
              Select the winner for each game. Picks are scored automatically when you confirm.
            </p>
            <PostResultsForm
              weekId={activeWeek.id}
              games={(games ?? []).map((g: any) => ({
                id: g.id,
                home_team: g.home_team,
                away_team: g.away_team,
                result: g.result,
              }))}
            />
          </div>
        )}

        {/* STATE: Results posted — close week */}
        {status === 'results_posted' && (
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-white">
                Week {activeWeek.week_number} — Results posted
              </span>
              <span className="text-xs text-blue-400 bg-blue-400/10 px-2 py-0.5 rounded-full">
                Results live
              </span>
            </div>
            <p className="text-xs text-gray-500">
              Standings are updated. Close the week when everything looks good.
            </p>
            <CloseWeekButton weekId={activeWeek.id} />
          </div>
        )}
      </section>

      {/* ── Announcements ─────────────────────────────────── */}
      <section className="space-y-3">
        <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-widest">
          Post to feed
        </h2>
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 space-y-3">
          <AnnouncementForm
            weekId={activeWeek?.id ?? null}
            placeholder="Share something with the league…"
            type="general"
            label="Post to feed →"
          />
        </div>
      </section>

      {/* ── Dev tools (mock mode only) ────────────────────── */}
      {process.env.MOCK_ODDS === 'true' && activeWeek && (
        <section className="space-y-3">
          <h2 className="text-xs font-semibold text-yellow-600 uppercase tracking-widest">
            Dev tools
          </h2>
          <div className="bg-yellow-950/30 border border-yellow-900/50 rounded-xl p-4 space-y-2">
            <p className="text-xs text-yellow-700">Mock mode — not visible in production.</p>
            <DevResetButton weekId={activeWeek.id} />
          </div>
        </section>
      )}

      {/* ── League Management ─────────────────────────────── */}
      <section className="space-y-3">
        <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-widest">
          League
        </h2>
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
