import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/server'
import BottomNav from '@/components/BottomNav'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await createServiceClient()
    .from('users')
    .select('role')
    .eq('id', user.id)
    .maybeSingle()

  const isCommissioner = profile?.role === 'commissioner'

  return (
    <div className="min-h-screen flex flex-col max-w-lg mx-auto">
      <main className="flex-1 pb-20">
        {children}
      </main>
      <BottomNav isCommissioner={isCommissioner} />
    </div>
  )
}
