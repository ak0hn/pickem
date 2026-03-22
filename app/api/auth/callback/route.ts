import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/home'

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=no_code`)
  }

  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.exchangeCodeForSession(code)

  if (error || !user) {
    return NextResponse.redirect(`${origin}/login?error=auth_failed`)
  }

  // Check invite
  const serviceClient = await createServiceClient()
  const { data: invite } = await serviceClient
    .from('invites')
    .select('id, accepted_at')
    .eq('email', user.email!)
    .single()

  if (!invite) {
    await supabase.auth.signOut()
    return NextResponse.redirect(`${origin}/login?error=no_invite`)
  }

  // Ensure user row exists
  const { data: existingUser } = await serviceClient
    .from('users')
    .select('id')
    .eq('id', user.id)
    .single()

  if (!existingUser) {
    await serviceClient.from('users').insert({
      id: user.id,
      email: user.email,
      name: user.user_metadata.full_name ?? user.email,
      avatar_url: user.user_metadata.avatar_url ?? null,
      role: 'player',
    })
  }

  // Mark invite accepted if not already
  if (!invite.accepted_at) {
    await serviceClient
      .from('invites')
      .update({ accepted_at: new Date().toISOString() })
      .eq('id', invite.id)
  }

  return NextResponse.redirect(`${origin}${next}`)
}
