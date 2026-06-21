import { useState, FormEvent } from 'react'
import { Wheat, LogIn, Eye, EyeOff } from 'lucide-react'

interface Props {
  onLogin: (username: string, password: string) => Promise<boolean>
}

export default function Login({ onLogin }: Props) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!username.trim() || !password) return
    setError('')
    setLoading(true)
    const ok = await onLogin(username.trim(), password)
    if (!ok) {
      setError('Incorrect username or password.')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">

        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-amber-500 flex items-center justify-center mb-4 shadow-lg shadow-amber-500/30">
            <Wheat size={32} className="text-slate-900" />
          </div>
          <h1 className="text-white text-2xl font-bold">Mill Label System</h1>
          <p className="text-slate-400 text-sm mt-1">Sign in to continue</p>
        </div>

        {/* Card */}
        <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6 shadow-2xl">
          <form onSubmit={handleSubmit} className="space-y-4">

            {error && (
              <div className="bg-red-900/40 border border-red-700 text-red-300 text-sm px-4 py-3 rounded-lg">
                {error}
              </div>
            )}

            <div>
              <label className="block text-slate-300 text-sm mb-1.5">Username</label>
              <input
                className="input-field w-full"
                type="text"
                autoComplete="username"
                autoFocus
                value={username}
                onChange={e => setUsername(e.target.value)}
                placeholder="Enter username"
              />
            </div>

            <div>
              <label className="block text-slate-300 text-sm mb-1.5">Password</label>
              <div className="relative">
                <input
                  className="input-field w-full pr-10"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Enter password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || !username.trim() || !password}
              className="btn-primary w-full flex items-center justify-center gap-2 py-2.5 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <LogIn size={18} />
              {loading ? 'Signing in…' : 'Sign In'}
            </button>

          </form>
        </div>

      </div>
    </div>
  )
}
