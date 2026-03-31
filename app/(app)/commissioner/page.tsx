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

  // Per-game pick tallies (open state only)
  let pickTallies: Record<string, { home: number; away: number }> = {}
  if (status === 'open' && hasGames) {
    const gameIds = (games ?? []).map((g: any) => g.id)
    const { data: tallyPicks } = await db
      .from('picks')
      .select('game_id, picked_team')
      .in('game_id', gameIds)
    for (const pick of tallyPicks ?? []) {
      if (!pickTallies[pick.game_id]) pickTallies[pick.game_id] = { home: 0, away: 0 }
      if (pick.picked_team === 'home') pickTallies[pick.game_id].home++
      else if (pick.picked_team === 'away') pickTallies[pick.game_id].away++
    }
  }

  // Perfect scorers (needed for sunday_complete + tiebreaker states)
  let perfectCount = 0
  let eligiblePlayers: Array<{ id: string; name: string }> = []
  let threshold = 1

  if (status === 'sunday_complete' || status === 'tiebreaker' || status === 'results_posted') {
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
  let tiebreakerWinners: Array<{ id: string; name: string }> = []

  if (status === 'tiebreaker' || status === 'results_posted') {
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

      if (mnfResultConfirmed) {
        const { data: winPicks } = await db
          .from('picks')
          .select('user_id')
          .eq('game_id', tiebreakerGame.id)
          .eq('result', 'win')
        const winnerIds = (winPicks ?? []).map((p: any) => p.user_id)
        if (winnerIds.length > 0) {
          const { data: winnerUsers } = await db
            .from('users')
            .select('id, name')
            .in('id', winnerIds)
          tiebreakerWinners = winnerUsers ?? []
        }
      }
    }
  }

  return (
    <div className="p-4 space-y-6">
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

        {/* STATE: open → slate with pick distribution + actions */}
        {status === 'open' && (
          <>
            {/* Submission overview + post */}
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-white">Week {activeWeek.week_number} — Live</span>
                <span className="text-xs text-green-400 bg-green-400/10 px-2 py-0.5 rounded-full">Picks open</span>
              </div>
              <SubmissionTracker weekId={activeWeek.id} />
              <div className="border-t border-gray-800 pt-3">
                <AnnouncementForm
                  weekId={activeWeek.id}
                  placeholder="Pre-SNF update, score check, trash talk — what's the move?"
                  type="general"
                />
              </div>
            </div>

            {/* Slate with per-game pick split */}
            <SlateReview
              weekId={activeWeek.id}
              weekNumber={activeWeek.week_number}
              games={(games ?? []) as any}
              readOnly={true}
              pickTallies={pickTallies}
            />

            {/* Fetch results — after SNF ends */}
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 space-y-3">
              <div>
                <span className="text-sm font-semibold text-white">Sunday's done?</span>
                <p className="text-xs text-gray-500 mt-0.5">
                  Pull final scores after SNF ends — picks get scored automatically.
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

            <div className="border-t border-gray-800 pt-3">
              <ResultsAnnouncementForm
                weekId={activeWeek.id}
                perfectCount={perfectCount}
                threshold={threshold}
              />
            </div>
          </div>
        )}

        {/* STATE: tiebreaker — MNF is still part of the week */}
        {status === 'tiebreaker' && (
          <>
            {/* Sub-phase 1: MNF teams known, line not yet fetched (spread=0) */}
            {tiebreakerGame && tiebreakerGame.spread === 0 && (
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-white">Week {activeWeek.week_number} — Tiebreaker</span>
                  <span className="text-xs text-yellow-400 bg-yellow-400/10 px-2 py-0.5 rounded-full">
                    Needs MNF line
                  </span>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-gray-400">
                    Still perfect ({eligiblePlayers.length}):
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {eligiblePlayers.map((p) => (
                      <span key={p.id} className="text-xs bg-gray-800 text-white px-2 py-0.5 rounded-full">
                        {p.name}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="border-t border-gray-800 pt-3 space-y-1.5">
                  <p className="text-xs text-gray-500">
                    Fetch the Monday Night Football line to open the tiebreaker.
                  </p>
                  <FetchMNFLineButton weekId={activeWeek.id} />
                </div>
                {/* Full week slate — MNF at top (spread TBD), regular games scored */}
                <SlateReview
                  weekId={activeWeek.id}
                  weekNumber={activeWeek.week_number}
                  games={[tiebreakerGame, ...(games ?? [])] as any}
                  readOnly={true}
                />
              </div>
            )}

            {/* Sub-phase 2: MNF line fetched (spread>0), picks not open → post to open tiebreaker */}
            {tiebreakerGame && tiebreakerGame.spread > 0 && !tiebreakerPicksOpen && !mnfResultConfirmed && (
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-white">Week {activeWeek.week_number} — Tiebreaker</span>
                  <span className="text-xs text-yellow-400 bg-yellow-400/10 px-2 py-0.5 rounded-full">
                    MNF line fetched
                  </span>
                </div>
                {/* Eligible players */}
                <div className="space-y-1">
                  <p className="text-xs text-gray-400">Still in it ({eligiblePlayers.length}):</p>
                  <div className="flex flex-wrap gap-1.5">
                    {eligiblePlayers.map((p) => (
                      <span key={p.id} className="text-xs bg-gray-800 text-white px-2 py-0.5 rounded-full">
                        {p.name}
                      </span>
                    ))}
                  </div>
                </div>
                {/* Post box at top — opens MNF picks on submit */}
                <div className="border-b border-gray-800 pb-4">
                  <TiebreakerAnnouncementForm
                    weekId={activeWeek.id}
                    eligibleNames={eligiblePlayers.map((p) => p.name)}
                  />
                </div>
                {/* Full week slate — MNF at top with live spread */}
                <SlateReview
                  weekId={activeWeek.id}
                  weekNumber={activeWeek.week_number}
                  games={[tiebreakerGame, ...(games ?? [])] as any}
                  readOnly={true}
                />
              </div>
            )}

            {/* Sub-phase 3: picks open, waiting for MNF to end */}
            {tiebreakerGame && tiebreakerPicksOpen && !mnfResultConfirmed && (
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-white">Week {activeWeek.week_number} — MNF live</span>
                  <span className="text-xs text-blue-400 bg-blue-400/10 px-2 py-0.5 rounded-full">
                    Picks open
                  </span>
                </div>
                {/* Eligible players */}
                <div className="space-y-1">
                  <p className="text-xs text-gray-400">Still in it ({eligiblePlayers.length}):</p>
                  <div className="flex flex-wrap gap-1.5">
                    {eligiblePlayers.map((p) => (
                      <span key={p.id} className="text-xs bg-gray-800 text-white px-2 py-0.5 rounded-full">
                        {p.name}
                      </span>
                    ))}
                  </div>
                </div>
                {/* Pick submission progress — above the slate */}
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
                {/* Full week slate — MNF at top, still in progress */}
                <SlateReview
                  weekId={activeWeek.id}
                  weekNumber={activeWeek.week_number}
                  games={[tiebreakerGame, ...(games ?? [])] as any}
                  readOnly={true}
                />
              </div>
            )}

            {/* Sub-phase 4: MNF result confirmed → post results */}
            {tiebreakerGame && mnfResultConfirmed && (
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-white">Week {activeWeek.week_number} — MNF final</span>
                  <span className="text-xs text-orange-400 bg-orange-400/10 px-2 py-0.5 rounded-full">
                    Pending announcement
                  </span>
                </div>
                {/* Winners */}
                <div className="space-y-1.5">
                  {tiebreakerWinners.length === 0 ? (
                    <p className="text-xs text-gray-500">No winners from the tiebreaker.</p>
                  ) : (
                    <>
                      <p className="text-xs text-gray-400">
                        {tiebreakerWinners.length === 1 ? 'Winner:' : `Winners (${tiebreakerWinners.length}):`}
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {tiebreakerWinners.map((p) => (
                          <Link
                            key={p.id}
                            href={`/commissioner/player/${p.id}?week=${activeWeek.week_number}`}
                            className="text-xs bg-gray-800 text-white px-2 py-0.5 rounded-full active:bg-gray-700"
                          >
                            {p.name} ›
                          </Link>
                        ))}
                      </div>
                    </>
                  )}
                </div>
                {/* Text box — closing out the week */}
                <TiebreakerResultsForm weekId={activeWeek.id} />
                {/* Full week slate — MNF now shows Final + result */}
                <SlateReview
                  weekId={activeWeek.id}
                  weekNumber={activeWeek.week_number}
                  games={[tiebreakerGame, ...(games ?? [])] as any}
                  readOnly={true}
                />
              </div>
            )}
          </>
        )}

        {/* STATE: results_posted → done, cron closes on Wednesday */}
        {status === 'results_posted' && (
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-white">Week {activeWeek.week_number} — Wrapped</span>
              <span className="text-xs text-green-400 bg-green-400/10 px-2 py-0.5 rounded-full">Results live</span>
            </div>

            {/* Winners — tiebreaker winners take priority if week had one */}
            <div className="space-y-1.5">
              {(() => {
                const winners = tiebreakerWinners.length > 0 ? tiebreakerWinners : eligiblePlayers
                if (winners.length === 0) return <p className="text-xs text-gray-500">No perfect scores this week.</p>
                return (
                  <>
                    <p className="text-xs text-gray-400">
                      {winners.length === 1 ? 'Winner:' : `Winners (${winners.length}):`}
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {winners.map((p) => (
                        <Link
                          key={p.id}
                          href={`/commissioner/player/${p.id}?week=${activeWeek.week_number}`}
                          className="text-xs bg-gray-800 text-white px-2 py-0.5 rounded-full active:bg-gray-700"
                        >
                          {p.name} ›
                        </Link>
                      ))}
                    </div>
                  </>
                )
              })()}
            </div>

            <p className="text-xs text-gray-600">Next week kicks off Wednesday.</p>
          </div>
        )}
      </section>

      {/* ── Full slate (pending + post-open states; open + tiebreaker show slate inline in their tiles) ── */}
      {hasGames && activeWeek && status !== 'open' && status !== 'tiebreaker' && (
        <section className="space-y-3">
          {status !== 'pending' && (
            <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-widest">This week's slate</h2>
          )}
          <SlateReview
            weekId={activeWeek.id}
            weekNumber={activeWeek.week_number}
            seasonYear={status === 'pending' ? activeWeek.season_year : undefined}
            games={(tiebreakerGame ? [tiebreakerGame, ...(games ?? [])] : (games ?? [])) as any}
            readOnly={status !== 'pending'}
          />
        </section>
      )}

      {/* ── General feed post (not shown in pending or open — those states have their own primary CTA) ── */}
      {status !== 'open' && status !== 'pending' && (
        <section className="space-y-3">
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-widest">Post to feed</h2>
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
            <AnnouncementForm
              weekId={activeWeek?.id ?? null}
              placeholder={
                status === 'sunday_complete'
                  ? "Tease the results before you post them, or just hype the league up…"
                  : status === 'tiebreaker'
                  ? "Build the MNF tension — let the league feel it…"
                  : "Share something with the league…"
              }
              type="general"
            />
          </div>
        </section>
      )}

      {/* ── Dev tools ─────────────────────────────────────── */}
      {process.env.MOCK_ODDS === 'true' && activeWeek && (
        <section className="space-y-3">
          <h2 className="text-xs font-semibold text-yellow-600 uppercase tracking-widest">Dev tools</h2>
          <div className="bg-yellow-950/30 border border-yellow-900/50 rounded-xl p-4 space-y-2">
            <p className="text-xs text-yellow-700">Mock mode — not visible in production.</p>
            <DevResetButton weekId={activeWeek.id} weekNumber={activeWeek.week_number} seasonYear={activeWeek.season_year} />
          </div>
        </section>
      )}

      {/* ── League management ─────────────────────────────── */}
      <section className="space-y-3">
        <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-widest">League</h2>
        <div className="bg-gray-900 border border-gray-800 rounded-xl divide-y divide-gray-800">
          <Link
            href="/commissioner/league"
            className="flex items-center justify-between px-4 py-3.5 active:bg-gray-800 transition-colors"
          >
            <span className="text-sm text-white font-medium">Players, invites & settings</span>
            <span className="text-gray-600">›</span>
          </Link>
          <Link
            href="/commissioner/weeks"
            className="flex items-center justify-between px-4 py-3.5 active:bg-gray-800 transition-colors"
          >
            <span className="text-sm text-white font-medium">Past weeks</span>
            <span className="text-gray-600">›</span>
          </Link>
        </div>
      </section>
    </div>
  )
}
