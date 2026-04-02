'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const supabase = createClient()
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSuccess('')

    if (mode === 'login') {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) setError(error.message)
      else router.push('/dashboard')
    } else {
      const { error } = await supabase.auth.signUp({
        email, password,
        options: { emailRedirectTo: `${window.location.origin}/auth/callback` }
      })
      if (error) setError(error.message)
      else setSuccess('Check your email to confirm your account.')
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface-0 px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex items-center gap-2.5 mb-8 justify-center">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center text-lg"
               style={{background:'linear-gradient(135deg,#7c6af5,#5eead4)'}}>
            🦖
          </div>
          <span className="text-xl font-semibold tracking-tight">Raptor Bot</span>
        </div>

        <div className="card p-7">
          <h1 className="text-lg font-semibold mb-1">
            {mode === 'login' ? 'Welcome back' : 'Create account'}
          </h1>
          <p className="text-sm text-gray-500 mb-6">
            {mode === 'login' ? 'Sign in to your dashboard' : 'Start building your AI chatbot'}
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label mb-1.5 block">Email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                placeholder="you@company.com" required className="input" />
            </div>
            <div>
              <label className="label mb-1.5 block">Password</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)}
                placeholder="••••••••" required minLength={6} className="input" />
            </div>

            {error && (
              <div className="text-xs text-red-400 bg-red-950/50 border border-red-900/50 rounded-lg px-3 py-2.5">
                {error}
              </div>
            )}
            {success && (
              <div className="text-xs text-green-400 bg-green-950/50 border border-green-900/50 rounded-lg px-3 py-2.5">
                {success}
              </div>
            )}

            <button type="submit" disabled={loading} className="btn-primary w-full mt-2">
              {loading ? 'Please wait…' : mode === 'login' ? 'Sign in' : 'Create account'}
            </button>
          </form>

          <p className="text-center text-sm text-gray-600 mt-5">
            {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
            <button onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setError('') }}
              className="text-raptor-400 hover:text-raptor-300 transition-colors">
              {mode === 'login' ? 'Sign up' : 'Sign in'}
            </button>
          </p>
        </div>
      </div>
    </div>
  )
}
