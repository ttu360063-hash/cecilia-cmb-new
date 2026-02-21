import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Eye, EyeOff, Lock, ShieldCheck } from 'lucide-react'
import { isAdminAuthenticated, setAdminAuthenticated } from '../lib/auth'

const brandLogoUrl = 'https://i.ibb.co/LsL79MB/logotipo-empresa.jpg'

const AdminLogin: React.FC = () => {
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const navigate = useNavigate()

  useEffect(() => {
    if (isAdminAuthenticated()) {
      navigate('/admin', { replace: true })
    }
  }, [navigate])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    if (password === 'CECILIACMB') {
      setAdminAuthenticated(true)
      navigate('/admin', { replace: true })
    } else {
      setError('Senha incorreta.')
    }

    setLoading(false)
    setPassword('')
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_#e2e8f0_0%,_#f8fafc_45%,_#ecfeff_100%)] flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white/90 backdrop-blur shadow-[0_20px_60px_-28px_rgba(2,6,23,0.45)] p-8">
        <div className="text-center mb-8">
          <img
            src={brandLogoUrl}
            alt="Logomarca Cecilia Cama Mesa e Banho"
            className="mx-auto mb-4 h-16 w-16 rounded-full border-2 border-white object-cover shadow-md"
          />
          <p className="text-xs font-semibold uppercase tracking-wide text-cyan-700">Cecilia Cama Mesa e Banho</p>
          <div className="mx-auto mb-5 grid h-20 w-20 place-content-center rounded-2xl bg-gradient-to-br from-cyan-500 to-slate-800 text-white shadow-lg">
            <ShieldCheck size={34} />
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">Area Administrativa</h1>
          <p className="text-slate-600 mt-2">Acesso restrito para administradores</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-700">Senha de acesso</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 pr-12 text-slate-900 outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100"
                placeholder="Digite a senha administrativa"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword((value) => !value)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 transition hover:text-slate-800"
                aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
            {error && <p className="mt-2 text-sm font-medium text-rose-600">{error}</p>}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 py-3 font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Lock size={18} />
            {loading ? 'Verificando...' : 'Acessar area restrita'}
          </button>
        </form>

        <div className="mt-7 text-center">
          <button
            onClick={() => navigate('/vendas')}
            className="text-sm font-semibold text-cyan-700 transition hover:text-cyan-900"
          >
            Voltar para area publica
          </button>
        </div>
      </div>
    </div>
  )
}

export default AdminLogin
