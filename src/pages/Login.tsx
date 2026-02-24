import React, { useEffect, useState } from 'react'
import { Eye, EyeOff, Lock, User } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { getStoredUser } from '../lib/auth'
import { resolveDefaultRoute } from '../lib/routes'

const brandLogoUrl = '/brand/logo-cecilia.jpg'

const Login: React.FC = () => {
  const navigate = useNavigate()
  const { login, isAuthenticated, user } = useAuth()

  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (isAuthenticated) {
      navigate(resolveDefaultRoute(user), { replace: true })
    }
  }, [isAuthenticated, navigate, user])

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setError('')
    setSubmitting(true)

    try {
      await login(username, password)
      navigate(resolveDefaultRoute(getStoredUser()), { replace: true })
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Falha ao autenticar.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_#2a1240_0%,_#12071e_38%,_#07030d_100%)] flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md rounded-2xl border border-fuchsia-900/40 bg-[#12081e]/95 p-8 shadow-[0_0_50px_rgba(219,39,119,0.18)]">
        <div className="mb-8 text-center">
          <img
            src={brandLogoUrl}
            alt="Logomarca Cecilia Cama Mesa e Banho"
            className="mx-auto mb-4 h-20 w-20 rounded-xl border border-fuchsia-500/35 bg-black object-contain p-2 shadow-md"
          />
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-fuchsia-300">Cecilia Cama Mesa e Banho</p>
          <h1 className="mt-4 text-2xl font-extrabold tracking-tight text-fuchsia-50">Entrar no Sistema</h1>
          <p className="mt-2 text-sm text-fuchsia-100/80">Acesso por usuario e senha com controle de permissoes</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="mb-2 block text-sm font-semibold text-fuchsia-100">Usuario</label>
            <div className="relative">
              <User size={18} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-fuchsia-300" />
              <input
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                className="w-full rounded-xl border border-fuchsia-500/35 bg-[#140a21] py-3 pl-10 pr-4 text-fuchsia-50 outline-none transition focus:border-fuchsia-400 focus:ring-2 focus:ring-fuchsia-500/25"
                placeholder="Digite seu usuario"
                autoComplete="username"
                required
              />
            </div>
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-fuchsia-100">Senha</label>
            <div className="relative">
              <Lock size={18} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-fuchsia-300" />
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="w-full rounded-xl border border-fuchsia-500/35 bg-[#140a21] py-3 pl-10 pr-12 text-fuchsia-50 outline-none transition focus:border-fuchsia-400 focus:ring-2 focus:ring-fuchsia-500/25"
                placeholder="Digite sua senha"
                autoComplete="current-password"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword((value) => !value)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-fuchsia-300 transition hover:text-fuchsia-100"
                aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {error && <p className="text-sm font-medium text-rose-300">{error}</p>}

          <button
            type="submit"
            disabled={submitting}
            className="inline-flex w-full items-center justify-center rounded-xl bg-fuchsia-600 py-3 font-semibold text-white transition hover:bg-fuchsia-500 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? 'Entrando...' : 'Entrar'}
          </button>
        </form>
      </div>
    </div>
  )
}

export default Login
