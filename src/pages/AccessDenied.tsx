import React from 'react'
import { Link } from 'react-router-dom'

const AccessDenied: React.FC = () => {
  return (
    <div className="rounded-2xl border border-fuchsia-900/40 bg-[#12081e]/95 p-8 text-center shadow-[0_0_50px_rgba(219,39,119,0.18)]">
      <h1 className="text-2xl font-bold text-fuchsia-100">Acesso n?o autorizado</h1>
      <p className="mt-3 text-fuchsia-200/80">
        Seu usu?rio n?o possui permiss?o para acessar esta p?gina.
      </p>
      <Link
        to="/vendas"
        className="mt-6 inline-flex items-center rounded-lg bg-fuchsia-600 px-4 py-2 font-semibold text-white transition hover:bg-fuchsia-500"
      >
        Voltar para a p?gina inicial
      </Link>
    </div>
  )
}

export default AccessDenied
