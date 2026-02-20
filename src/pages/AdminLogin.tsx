
import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {Lock, Eye, EyeOff} from 'lucide-react'

const AdminLogin: React.FC = () => {
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    // Simular verificação (senha não deve ser visível no código em produção)
    if (password === 'CECILIACMB') {
      // Redirecionar para o dashboard administrativo
      navigate('/admin')
    } else {
      setError('Senha incorreta!')
    }
    
    setLoading(false)
    setPassword('')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-blue-800 to-blue-700 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <div className="mx-auto w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mb-4">
            <Lock size={40} className="text-blue-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-800">Área Administrativa</h1>
          <p className="text-gray-600 mt-2">Acesso restrito para administradores</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Senha de Acesso
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent pr-12"
                placeholder="Digite a senha administrativa"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
            {error && (
              <p className="mt-2 text-sm text-red-600">{error}</p>
            )}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
          >
            {loading ? 'Verificando...' : 'Acessar Área Restrita'}
          </button>
        </form>

        <div className="mt-8 text-center">
          <button 
            onClick={() => navigate('/vendas')}
            className="text-blue-600 hover:text-blue-800 text-sm font-medium"
          >
            ← Voltar para área pública
          </button>
        </div>
      </div>
    </div>
  )
}

export default AdminLogin
