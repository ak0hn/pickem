import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/server'
import BottomNav from '@/components/BottomNav'
import AppHeader from '@/components/AppHeader'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const db = createServiceClient()

  const [{ data: profile }, { data: activeWeek }] = await Promise.all([
    db.from('users').select('role').eq('id', user.id).maybeSingle(),
    db.from('weeks').select('week_number, status')
      .not('status', 'eq', 'closed')
      .order('week_number', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ])

  const isCommissioner = profile?.role === 'commissioner'

  return (
    <div className="min-h-screen flex flex-col max-w-lg mx-auto">
      <AppHeader
        weekNumber={activeWeek?.week_number ?? null}
        weekStatus={activeWeek?.status ?? null}
      />
      <main className="flex-1 pb-20">
        {children}
      </main>
      <BottomNav isCommissioner={isCommissioner} />
    </div>
  )
}
