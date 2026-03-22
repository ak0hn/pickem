import { redirect } from 'next/navigation'
import { createServiceClient } from '@/lib/supabase/server'

export default async function InvitePage({ params }: { params: { token: string } }) {
  const supabase = await createServiceClient()

  const { data: invite } = await supabase
    .from('invites')
    .select('id, email, accepted_at')
    .eq('token', params.token)
    .single()

  if (!invite) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-950">
        <div className="text-center px-6">
          <h1 className="text-2xl font-bold text-white mb-2">Invalid Invite</h1>
          <p className="text-gray-400">This invite link is invalid or has expired.</p>
        </div>
      </div>
    )
  }

  if (invite.accepted_at) {
    redirect('/login')
  }

  redirect(`/login?invite_token=${params.token}`)
}
