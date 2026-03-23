'use client'
import { Suspense, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useSearchParams, useRouter } from 'next/navigation'

const ERROR_MESSAGES: Record<string, string> = {
  no_invite: "You need an invitation to join this league. Contact the commissioner.",
  auth_failed: "Sign-in failed. Please try again.",
  no_code: "Something went wrong. Please try again.",
}

function LoginForm() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const error = searchParams.get('error')
  const token = searchParams.get('invite_token')

  const [mode, setMode] = useState<'choose' | 'signin' | 'signup'>('choose')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  async function signInWithGoogle() {
    const supabase = createClient()
    const redirectTo = `${window.location.origin}/api/auth/callback${token ? `?invite_token=${token}` : ''}`
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo },
    })
  }

  async function handleEmailSignIn(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setFormError(null)
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setFormError('Invalid email or password.')
      setLoading(false)
      return
    }
    router.push('/home')
  }

  async function handleEmailSignUp(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setFormError(null)
    const supabase = createClient()

    // Check invite before creating account
    const { data: invite } = await supabase
      .from('invites')
      .select('id')
      .eq('email', email.toLowerCase().trim())
      .is('accepted_at', null)
      .single()

    if (!invite) {
      setFormError("This email hasn't been invited to the league. Contact the commissioner.")
      setLoading(false)
      return
    }

    const { error } = await supabase.auth.signUp({
      email: email.toLowerCase().trim(),
      password,
      options: {
        data: { full_name: name },
        emailRedirectTo: `${window.location.origin}/api/auth/callback`,
      },
    })

    if (error) {
      setFormError(error.message)
      setLoading(false)
      return
    }

    setSuccessMessage("Check your email for a confirmation link. Click it to complete sign-up.")
    setLoading(false)
  }

  if (successMessage) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-950">
        <div className="w-full max-w-sm mx-auto px-6 text-center">
          <div className="text-4xl mb-4">📬</div>
          <h2 className="text-xl font-bold text-white mb-2">Check your email</h2>
          <p className="text-gray-400 text-sm">{successMessage}</p>
          <button onClick={() => { setSuccessMessage(null); setMode('choose') }} className="mt-6 text-sm text-gray-500 hover:text-gray-300">
            Back to sign in
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-950">
      <div className="w-full max-w-sm mx-auto px-6">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Pick&apos;em</h1>
          <p className="text-gray-400">NFL Pick&apos;em League</p>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-lg bg-red-950 border border-red-800 text-red-300 text-sm">
            {ERROR_MESSAGES[error] ?? 'Something went wrong.'}
          </div>
        )}

        {formError && (
          <div className="mb-4 p-4 rounded-lg bg-red-950 border border-red-800 text-red-300 text-sm">
            {formError}
          </div>
        )}

        {mode === 'choose' && (
          <div className="space-y-3">
            <button
              onClick={signInWithGoogle}
              className="w-full flex items-center justify-center gap-3 bg-white text-gray-900 font-semibold py-3 px-4 rounded-xl hover:bg-gray-100 transition-colors"
            >
              <GoogleIcon />
              Continue with Google
            </button>

            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-gray-800" />
              <span className="text-gray-600 text-xs">or</span>
              <div className="flex-1 h-px bg-gray-800" />
            </div>

            <button
              onClick={() => setMode('signin')}
              className="w-full py-3 px-4 rounded-xl border border-gray-700 text-white font-semibold hover:bg-gray-900 transition-colors"
            >
              Sign in with email
            </button>

            <p className="text-center text-gray-600 text-xs pt-2">
              First time?{' '}
              <button onClick={() => setMode('signup')} className="text-gray-400 hover:text-white underline">
                Create an account
              </button>
            </p>
          </div>
        )}

        {mode === 'signin' && (
          <form onSubmit={handleEmailSignIn} className="space-y-3">
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-gray-500"
            />
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-gray-500"
            />
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 rounded-xl bg-white text-gray-900 font-semibold hover:bg-gray-100 transition-colors disabled:opacity-50"
            >
              {loading ? 'Signing in...' : 'Sign in'}
            </button>
            <button type="button" onClick={() => { setMode('choose'); setFormError(null) }} className="w-full text-center text-sm text-gray-500 hover:text-gray-300">
              Back
            </button>
          </form>
        )}

        {mode === 'signup' && (
          <form onSubmit={handleEmailSignUp} className="space-y-3">
            <input
              type="text"
              placeholder="Your name"
              value={name}
              onChange={e => setName(e.target.value)}
              required
              className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-gray-500"
            />
            <input
              type="email"
              placeholder="Email (must match your invite)"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-gray-500"
            />
            <input
              type="password"
              placeholder="Password (8+ characters)"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              minLength={8}
              className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-gray-500"
            />
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 rounded-xl bg-white text-gray-900 font-semibold hover:bg-gray-100 transition-colors disabled:opacity-50"
            >
              {loading ? 'Creating account...' : 'Create account'}
            </button>
            <button type="button" onClick={() => { setMode('choose'); setFormError(null) }} className="w-full text-center text-sm text-gray-500 hover:text-gray-300">
              Back
            </button>
          </form>
        )}

        <p className="text-center text-gray-600 text-xs mt-8">
          Invite-only league. You must be invited by the commissioner.
        </p>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  )
}

function GoogleIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
    </svg>
  )
}
