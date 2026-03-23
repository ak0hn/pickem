import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/server'

export default async function CommissionerPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await createServiceClient()
    .from('users')
    .select('role')
    .eq('id', user.id)
    .maybeSingle()

  if (profile?.role !== 'commissioner') redirect('/home')

  return (
    <div className="p-4 space-y-6">
      <h1 className="text-2xl font-bold text-white">Commissioner</h1>

      {/* This Week */}
      <section className="space-y-3">
        <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-widest">This Week</h2>

        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-white">Week status</span>
            <span className="text-xs text-gray-500 bg-gray-800 px-2 py-0.5 rounded-full">No active week</span>
          </div>
          <p className="text-xs text-gray-600">
            Create a week and fetch lines from The Odds API to get started.
          </p>
          <button
            disabled
            className="w-full py-2 px-4 rounded-lg bg-blue-600 text-white text-sm font-medium opacity-40 cursor-not-allowed"
          >
            Fetch this week's lines
          </button>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-white">Pick submissions</span>
            <span className="text-xs text-gray-500">—</span>
          </div>
          <p className="text-xs text-gray-600">Submission tracker available once a week is open.</p>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-white">Results</span>
            <span className="text-xs text-gray-500">—</span>
          </div>
          <p className="text-xs text-gray-600">Results dashboard available once games are in progress.</p>
        </div>
      </section>

      {/* Invites & Players */}
      <section className="space-y-3">
        <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-widest">Invites & Players</h2>

        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 space-y-3">
          <p className="text-xs text-gray-600">Invite a player by email or manage the current roster.</p>
          <button
            disabled
            className="w-full py-2 px-4 rounded-lg bg-gray-800 text-gray-400 text-sm font-medium opacity-40 cursor-not-allowed"
          >
            Invite player
          </button>
        </div>
      </section>

      {/* League Settings */}
      <section className="space-y-3">
        <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-widest">League Settings</h2>

        <div className="bg-gray-900 border border-gray-800 rounded-xl divide-y divide-gray-800">
          {[
            ['Season', '—'],
            ['MNF tiebreaker threshold', '—'],
            ['Weekly prize', '—'],
            ['Season prize', '—'],
            ['Commissioner reminder deadline', '—'],
          ].map(([label, value]) => (
            <div key={label} className="flex items-center justify-between px-4 py-3">
              <span className="text-sm text-gray-300">{label}</span>
              <span className="text-xs text-gray-600">{value}</span>
            </div>
          ))}
        </div>
        <p className="text-xs text-gray-600 px-1">League settings configuration coming soon.</p>
      </section>
    </div>
  )
}
