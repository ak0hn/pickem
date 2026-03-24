import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/server'
import BottomNav from '@/components/BottomNav'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const db = createServiceClient()

  const [{ data: profile }, { data: activeWeek }] = await Promise.all([
    db.from('users').select('role').eq('id', user.id).maybeSingle(),
    db.from('weeks').select('week_number, status').in('status', ['pending', 'open'])
      .order('week_number', { ascending: false }).limit(1).maybeSingle(),
  ])

  const isCommissioner = profile?.role === 'commissioner'

  return (
    <div className="min-h-screen flex flex-col max-w-lg mx-auto">
      {/* Persistent week status bar */}
      {activeWeek && (
        <div className="sticky top-0 z-20 bg-gray-950 border-b border-gray-800 px-4 py-2 flex items-center justify-between">
          <span className="text-sm font-semibold text-white">Week {activeWeek.week_number}</span>
          <span className={`text-xs px-2 py-0.5 rounded-full ${
            activeWeek.status === 'open'
              ? 'text-green-400 bg-green-400/10'
              : 'text-yellow-600 bg-yellow-600/10'
          }`}>
            {activeWeek.status === 'open' ? 'Picks open' : 'Coming soon'}
          </span>
        </div>
      )}
      <main className="flex-1 pb-20">
        {children}
      </main>
      <BottomNav isCommissioner={isCommissioner} />
    </div>
  )
}
