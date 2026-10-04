import { useState } from 'react'
import type { FormEvent } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { loginSchema } from '../lib/validation'
import { Spinner } from '../components/ui/LoadingState'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const { signIn } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const from = (location.state as { from?: { pathname: string } } | null)?.from?.pathname ?? '/dashboard'

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)

    const parsed = loginSchema.safeParse({ email, password })
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Invalid credentials')
      return
    }

    setLoading(true)
    const { error: signInError } = await signIn(email, password)

    if (signInError) {
      setError(signInError)
      setLoading(false)
      return
    }

    navigate(from, { replace: true })
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      <div className="flex flex-1 flex-col justify-center px-6 py-12 lg:px-20">
        <div className="mx-auto w-full max-w-md">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-600 text-xl font-bold text-white shadow-lg shadow-blue-600/30">
              S
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Student Insight AI</h1>
              <p className="text-sm text-gray-500">Academic Analytics & Career Recommendations</p>
            </div>
          </div>

          <h2 className="mt-10 text-lg font-semibold text-gray-900">Sign in to your account</h2>
          <p className="mt-1 text-sm text-gray-500">
            Authorized faculty and administrators only.
          </p>

          <form onSubmit={handleSubmit} className="mt-8 space-y-5">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Email address
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 block w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm text-gray-900 shadow-sm outline-none transition-colors placeholder:text-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                placeholder="admin@institution.edu"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Password
              </label>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 block w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm text-gray-900 shadow-sm outline-none transition-colors placeholder:text-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                placeholder="••••••••"
              />
            </div>

            {error && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading && <Spinner className="h-4 w-4 text-white" />}
              {loading ? 'Signing in...' : 'Sign in'}
            </button>
          </form>
        </div>
      </div>

      <div className="hidden flex-1 bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 lg:flex lg:flex-col lg:justify-between lg:px-20 lg:py-14">
        <div>
          <h2 className="text-3xl font-bold text-white">
            Face Recognition Academic Analytics System
          </h2>
          <p className="mt-3 max-w-lg text-sm leading-relaxed text-blue-100">
            Identify students, analyze academic performance, predict future CGPA, and generate
            career recommendations in one secure dashboard.
          </p>
        </div>
        <div className="space-y-4">
          {[
            'Secure face-based student identification',
            'Semester GPA / CGPA trend analytics',
            'ML-assisted future performance estimation',
            'Career role compatibility recommendations',
          ].map((feature) => (
            <div key={feature} className="flex items-center gap-3 text-sm text-blue-100">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white/20">
                <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                </svg>
              </span>
              {feature}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}