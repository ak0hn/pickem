'use client'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function SettingsPage() {
  const router = useRouter()

  async function signOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <div className="p-4">
      <h1 className="text-xl font-bold">Settings</h1>
      <p className="text-gray-400 mt-2 mb-8">Settings coming soon.</p>
      <button
        onClick={signOut}
        className="w-full py-3 px-4 rounded-xl border border-red-800 text-red-400 hover:bg-red-950 transition-colors"
      >
        Sign out
      </button>
    </div>
  )
}
