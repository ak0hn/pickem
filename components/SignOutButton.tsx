'use client'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function SignOutButton() {
  const router = useRouter()

  async function signOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <button
      onClick={signOut}
      className="w-full py-3 px-4 rounded-xl border border-red-800 text-red-400 hover:bg-red-950 transition-colors text-sm font-medium"
    >
      Sign out
    </button>
  )
}
