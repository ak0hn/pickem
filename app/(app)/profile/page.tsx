import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/server'
import SignOutButton from '@/components/SignOutButton'

export default async function ProfilePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await createServiceClient()
    .from('users')
    .select('name, email, avatar_url, role')
    .eq('id', user.id)
    .maybeSingle()

  return (
    <div className="p-4 space-y-8">
      {/* Profile header */}
      <div className="space-y-1">
        <p className="text-2xl font-bold text-white">{profile?.name ?? user.email}</p>
        <p className="text-sm text-gray-500">{profile?.email ?? user.email}</p>
        {profile?.role === 'commissioner' && (
          <span className="inline-block text-xs font-semibold text-yellow-400 bg-yellow-400/10 px-2 py-0.5 rounded-full">
            Commissioner
          </span>
        )}
      </div>

      {/* Stats — placeholder */}
      <section className="space-y-2">
        <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-widest">Season Stats</h2>
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 text-gray-500 text-sm">
          Stats coming soon.
        </div>
      </section>

      {/* Pick history — placeholder */}
      <section className="space-y-2">
        <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-widest">Pick History</h2>
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 text-gray-500 text-sm">
          Pick history coming soon.
        </div>
      </section>

      {/* Settings section */}
      <section className="space-y-2">
        <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-widest">Account</h2>
        <div className="bg-gray-900 border border-gray-800 rounded-xl divide-y divide-gray-800">
          <div className="flex items-center justify-between px-4 py-3">
            <span className="text-sm text-gray-300">Notifications</span>
            <span className="text-xs text-gray-600">Coming soon</span>
          </div>
          <div className="flex items-center justify-between px-4 py-3">
            <span className="text-sm text-gray-300">Email</span>
            <span className="text-xs text-gray-500">{profile?.email ?? user.email}</span>
          </div>
        </div>
      </section>

      {/* Sign out */}
      <SignOutButton />
    </div>
  )
}
