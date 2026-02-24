import React, { useMemo, useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import {
  BarChart3,
  Shield,
  LayoutGrid,
  LogOut,
  Menu,
  Package,
  Settings,
  ShoppingCart,
  UserSquare2,
  Users,
  X,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import type { Permission } from '../lib/auth'
import { resolveDefaultRoute } from '../lib/routes'

type NavItem = {
  path: string
  label: string
  icon: React.ReactNode
  permission: Permission
}

const navItems: NavItem[] = [
  {
    path: '/dashboard',
    label: 'Dashboard',
    icon: <LayoutGrid size={16} />,
    permission: 'dashboard',
  },
  {
    path: '/vendas',
    label: 'Nova Venda',
    icon: <ShoppingCart size={16} />,
    permission: 'vender',
  },
  {
    path: '/clientes',
    label: 'Clientes',
    icon: <UserSquare2 size={16} />,
    permission: 'clientes',
  },
  {
    path: '/produtos',
    label: 'Produtos',
    icon: <Package size={16} />,
    permission: 'produtos',
  },
  {
    path: '/vendas-lista',
    label: 'Vendas',
    icon: <Users size={16} />,
    permission: 'ver_vendas',
  },
  {
    path: '/relatorios',
    label: 'Relatorios',
    icon: <BarChart3 size={16} />,
    permission: 'relatorios',
  },
  {
    path: '/pagamentos',
    label: 'Configuracoes',
    icon: <Settings size={16} />,
    permission: 'configuracoes',
  },
  {
    path: '/usuarios',
    label: 'Usuarios',
    icon: <Shield size={16} />,
    permission: 'usuarios',
  },
]

const brandLogoUrl = '/brand/logo-cecilia.jpg'

const desktopNavClassName = ({ isActive }: { isActive: boolean }) =>
  `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-semibold transition ${
    isActive
      ? 'bg-fuchsia-600 text-white shadow-lg shadow-fuchsia-900/35'
      : 'text-slate-200 hover:bg-fuchsia-950/40 hover:text-white'
  }`

const mobileNavClassName = ({ isActive }: { isActive: boolean }) =>
  `flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold transition ${
    isActive
      ? 'bg-fuchsia-600 text-white'
      : 'bg-fuchsia-950/35 text-fuchsia-100 hover:bg-fuchsia-900/45 hover:text-white'
  }`

const Layout: React.FC = () => {
  const [menuOpen, setMenuOpen] = useState(false)
  const navigate = useNavigate()
  const { user, hasPermission, logout } = useAuth()

  const visibleItems = useMemo(
    () => navItems.filter((item) => hasPermission(item.permission)),
    [hasPermission],
  )

  const handleLogout = () => {
    logout()
    navigate('/login', { replace: true })
  }

  const goHome = () => {
    navigate(resolveDefaultRoute(user), { replace: true })
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_#2a1240_0%,_#12071e_38%,_#07030d_100%)]">
      <header className="sticky top-0 z-40 border-b border-fuchsia-900/40 bg-[#10071a]/92 backdrop-blur-xl">
        <div className="mx-auto flex w-full max-w-[1500px] items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <button onClick={goHome} className="min-w-0 flex items-center gap-3 text-left sm:gap-4">
            <img
              src={brandLogoUrl}
              alt="Logomarca Cecilia Cama Mesa e Banho"
              className="h-12 w-12 rounded-lg border border-fuchsia-500/35 bg-black object-contain p-1 shadow-md"
            />
            <div className="min-w-0">
              <div className="inline-flex items-center gap-2 rounded-full border border-fuchsia-500/35 bg-fuchsia-500/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-fuchsia-100">
                <span className="inline-block h-2 w-2 rounded-full bg-fuchsia-400" />
                Cecilia Cama Mesa e Banho
              </div>
              <h1 className="mt-2 truncate text-lg font-extrabold tracking-tight text-fuchsia-50 sm:text-xl">
                Sistema de Gestao Comercial
              </h1>
            </div>
          </button>

          <div className="hidden items-center gap-3 lg:flex">
            <div className="rounded-xl border border-fuchsia-500/30 bg-fuchsia-500/10 px-3 py-2 text-right">
              <p className="text-xs text-fuchsia-200">Usuario ativo</p>
              <p className="text-sm font-semibold text-fuchsia-50">{user?.name || user?.username || '-'}</p>
            </div>
            <button
              onClick={handleLogout}
              className="inline-flex items-center gap-2 rounded-xl border border-rose-500/40 bg-rose-500/15 px-3.5 py-2 text-sm font-semibold text-rose-200 transition hover:bg-rose-500/25"
            >
              <LogOut size={16} />
              Sair
            </button>
          </div>

          <button
            onClick={() => setMenuOpen((value) => !value)}
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-fuchsia-500/35 bg-[#180c26] text-fuchsia-100 shadow-sm transition hover:bg-fuchsia-900/35 lg:hidden"
            aria-label="Abrir menu"
          >
            {menuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </header>

      <div className="mx-auto w-full max-w-[1500px] px-2 py-4 sm:px-4 lg:px-6">
        <div className="grid gap-4 lg:grid-cols-[250px_1fr]">
          <aside className="hidden lg:flex flex-col rounded-2xl bg-[#0f061a] p-4 shadow-[0_0_40px_rgba(219,39,119,0.15)]">
            <div className="mb-6 border-b border-fuchsia-900/40 pb-4">
              <img
                src={brandLogoUrl}
                alt="Logomarca Cecilia"
                className="mx-auto h-16 w-16 rounded-lg border border-fuchsia-500/35 bg-black object-contain p-1"
              />
              <p className="mt-3 text-xs uppercase tracking-[0.2em] text-fuchsia-300">Cecilia Cama Mesa e Banho</p>
            </div>

            <nav className="space-y-2">
              {visibleItems.map((item) => (
                <NavLink key={item.path} to={item.path} end className={desktopNavClassName}>
                  {item.icon}
                  <span>{item.label}</span>
                </NavLink>
              ))}
            </nav>

            <div className="mt-auto border-t border-fuchsia-900/40 pt-4 text-xs text-fuchsia-200/80">
              <p>Contato: (79) 9 9651-3935</p>
            </div>
          </aside>

          <section className="min-w-0 sales-theme">
            {menuOpen && (
              <div className="mb-4 rounded-2xl border border-fuchsia-900/40 bg-[#12081e]/95 p-4 shadow-[0_0_30px_rgba(219,39,119,0.14)] lg:hidden">
                <div className="mb-3 rounded-xl border border-fuchsia-500/30 bg-fuchsia-500/10 px-3 py-2">
                  <p className="text-xs text-fuchsia-200">Usuario ativo</p>
                  <p className="text-sm font-semibold text-fuchsia-50">{user?.name || user?.username || '-'}</p>
                </div>

                <div className="grid gap-2">
                  {visibleItems.map((item) => (
                    <NavLink
                      key={item.path}
                      to={item.path}
                      end
                      onClick={() => setMenuOpen(false)}
                      className={mobileNavClassName}
                    >
                      {item.icon}
                      <span>{item.label}</span>
                    </NavLink>
                  ))}
                </div>

                <button
                  onClick={handleLogout}
                  className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-rose-500/40 bg-rose-500/15 px-3.5 py-2 text-sm font-semibold text-rose-200 transition hover:bg-rose-500/25"
                >
                  <LogOut size={16} />
                  Sair
                </button>
              </div>
            )}

            <Outlet />
          </section>
        </div>
      </div>

      <footer className="border-t border-fuchsia-900/40 bg-[#10071a]/88">
        <div className="mx-auto flex w-full max-w-[1500px] flex-col gap-2 px-4 py-6 text-sm text-fuchsia-100/80 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div className="flex items-center gap-2.5">
            <img
              src={brandLogoUrl}
              alt="Logomarca Cecilia"
              className="h-9 w-9 rounded-md border border-fuchsia-500/35 bg-black object-contain p-1"
            />
            <span className="font-semibold text-fuchsia-50">CECILIA CAMA MESA E BANHO</span>
          </div>
          <span>Contato: (79) 9 9651-3935</span>
        </div>
      </footer>
    </div>
  )
}

export default Layout
