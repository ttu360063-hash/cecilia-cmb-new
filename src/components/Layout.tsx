import React, { useMemo, useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import {
  BarChart3,
  CreditCard,
  LayoutGrid,
  LogOut,
  Menu,
  Package,
  Settings,
  ShoppingCart,
  Users,
  UserSquare2,
  X,
} from 'lucide-react'
import { isAdminAuthenticated, setAdminAuthenticated } from '../lib/auth'

type NavItem = {
  path: string
  label: string
  icon: React.ReactNode
}

const publicNav: NavItem[] = [
  {
    path: '/vendas',
    label: 'Vendas',
    icon: <ShoppingCart size={17} />,
  },
]

const adminNav: NavItem[] = [
  {
    path: '/admin',
    label: 'Dashboard',
    icon: <LayoutGrid size={17} />,
  },
  {
    path: '/admin/produtos',
    label: 'Produtos',
    icon: <Package size={17} />,
  },
  {
    path: '/admin/clientes',
    label: 'Clientes',
    icon: <UserSquare2 size={17} />,
  },
  {
    path: '/admin/vendas',
    label: 'Vendas',
    icon: <Users size={17} />,
  },
  {
    path: '/admin/relatorios',
    label: 'Relatorios',
    icon: <BarChart3 size={17} />,
  },
  {
    path: '/admin/formas-pagamento',
    label: 'Pagamentos',
    icon: <CreditCard size={17} />,
  },
]

const brandLogoUrl = '/brand/logo-cecilia.jpg'

const Layout: React.FC = () => {
  const [menuOpen, setMenuOpen] = useState(false)
  const location = useLocation()
  const navigate = useNavigate()
  const adminMode = location.pathname.startsWith('/admin')
  const adminEnabled = isAdminAuthenticated()
  const salesMode = location.pathname.startsWith('/vendas')

  const desktopItems = useMemo(
    () => (adminMode && adminEnabled ? [...publicNav, ...adminNav] : publicNav),
    [adminMode, adminEnabled],
  )

  const mobileItems = desktopItems

  const navClass = ({ isActive }: { isActive: boolean }) => {
    if (salesMode) {
      return `inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-sm font-semibold transition ${
        isActive
          ? 'bg-fuchsia-600 text-white shadow-lg shadow-fuchsia-950/40'
          : 'text-fuchsia-100 hover:bg-fuchsia-900/30 hover:text-white'
      }`
    }

    return `inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-sm font-semibold transition ${
      isActive
        ? 'bg-slate-900 text-white shadow-lg shadow-slate-900/20'
        : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
    }`
  }

  const mobileNavClass = ({ isActive }: { isActive: boolean }) => {
    if (salesMode) {
      return `flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold transition ${
        isActive
          ? 'bg-fuchsia-600 text-white'
          : 'bg-fuchsia-950/35 text-fuchsia-100 hover:bg-fuchsia-900/45 hover:text-white'
      }`
    }

    return `flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold transition ${
      isActive
        ? 'bg-slate-900 text-white'
        : 'bg-slate-100 text-slate-700 hover:bg-slate-200 hover:text-slate-900'
    }`
  }

  const handleLogout = () => {
    setAdminAuthenticated(false)
    setMenuOpen(false)
    navigate('/vendas', { replace: true })
  }

  return (
    <div
      className={
        salesMode
          ? 'min-h-screen bg-[radial-gradient(circle_at_top,_#2a1240_0%,_#12071e_38%,_#07030d_100%)]'
          : 'min-h-screen bg-[radial-gradient(circle_at_top,_#dbeafe_0%,_#f8fafc_32%,_#f1f5f9_100%)]'
      }
    >
      <header
        className={
          salesMode
            ? 'sticky top-0 z-40 border-b border-fuchsia-900/40 bg-[#10071a]/92 backdrop-blur-xl'
            : 'sticky top-0 z-40 border-b border-slate-200/80 bg-white/88 backdrop-blur-xl'
        }
      >
        <div className="mx-auto flex w-full max-w-[1400px] items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <div className="min-w-0 flex items-center gap-3 sm:gap-4">
            <img
              src={brandLogoUrl}
              alt="Logomarca Cecilia Cama Mesa e Banho"
              className={
                salesMode
                  ? 'h-12 w-12 rounded-lg border border-fuchsia-500/35 bg-black object-contain p-1 shadow-md'
                  : 'h-12 w-12 rounded-lg border border-slate-200 bg-black object-contain p-1 shadow-md'
              }
            />
            <div className="min-w-0">
              <div
                className={
                  salesMode
                    ? 'inline-flex items-center gap-2 rounded-full border border-fuchsia-500/35 bg-fuchsia-500/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-fuchsia-100'
                    : 'inline-flex items-center gap-2 rounded-full border border-cyan-200 bg-cyan-50 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-cyan-700'
                }
              >
                <span className={salesMode ? 'inline-block h-2 w-2 rounded-full bg-fuchsia-400' : 'inline-block h-2 w-2 rounded-full bg-cyan-500'} />
                Cecilia Cama Mesa e Banho
              </div>
              <h1
                className={
                  salesMode
                    ? 'mt-2 truncate text-lg font-extrabold tracking-tight text-fuchsia-50 sm:text-xl'
                    : 'mt-2 truncate text-lg font-extrabold tracking-tight text-slate-900 sm:text-xl'
                }
              >
                Sistema de Gestao Comercial
              </h1>
            </div>
          </div>

          <nav className="hidden items-center gap-2 lg:flex">
            {desktopItems.map((item) => (
              <NavLink key={item.path} to={item.path} className={navClass}>
                {item.icon}
                {item.label}
              </NavLink>
            ))}
            {adminEnabled ? (
              <button
                onClick={handleLogout}
                className={
                  salesMode
                    ? 'inline-flex items-center gap-2 rounded-xl border border-rose-500/40 bg-rose-500/15 px-3.5 py-2 text-sm font-semibold text-rose-200 transition hover:bg-rose-500/25'
                    : 'inline-flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2 text-sm font-semibold text-rose-700 transition hover:bg-rose-100'
                }
              >
                <LogOut size={16} />
                Sair
              </button>
            ) : (
              <NavLink
                to="/admin/login"
                className={
                  salesMode
                    ? 'inline-flex items-center gap-2 rounded-xl bg-fuchsia-600 px-3.5 py-2 text-sm font-semibold text-white transition hover:bg-fuchsia-500'
                    : 'inline-flex items-center gap-2 rounded-xl bg-slate-900 px-3.5 py-2 text-sm font-semibold text-white transition hover:bg-slate-800'
                }
              >
                <Settings size={16} />
                Area admin
              </NavLink>
            )}
          </nav>

          <button
            onClick={() => setMenuOpen((value) => !value)}
            className={
              salesMode
                ? 'inline-flex h-10 w-10 items-center justify-center rounded-xl border border-fuchsia-500/35 bg-[#180c26] text-fuchsia-100 shadow-sm transition hover:bg-fuchsia-900/35 lg:hidden'
                : 'inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:bg-slate-100 lg:hidden'
            }
            aria-label="Abrir menu"
          >
            {menuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>

        {menuOpen && (
          <div className={salesMode ? 'border-t border-fuchsia-900/40 bg-[#130920] p-4 lg:hidden' : 'border-t border-slate-200 bg-white p-4 lg:hidden'}>
            <div className="grid gap-2">
              {mobileItems.map((item) => (
                <NavLink key={item.path} to={item.path} onClick={() => setMenuOpen(false)} className={mobileNavClass}>
                  {item.icon}
                  {item.label}
                </NavLink>
              ))}
            </div>

            <div className={salesMode ? 'mt-4 border-t border-fuchsia-900/40 pt-4' : 'mt-4 border-t border-slate-200 pt-4'}>
              {adminEnabled ? (
                <button
                  onClick={handleLogout}
                  className={
                    salesMode
                      ? 'flex w-full items-center justify-center gap-2 rounded-xl border border-rose-500/40 bg-rose-500/15 px-4 py-3 text-sm font-semibold text-rose-200'
                      : 'flex w-full items-center justify-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700'
                  }
                >
                  <LogOut size={16} />
                  Sair da area admin
                </button>
              ) : (
                <NavLink
                  to="/admin/login"
                  onClick={() => setMenuOpen(false)}
                  className={
                    salesMode
                      ? 'flex w-full items-center justify-center gap-2 rounded-xl bg-fuchsia-600 px-4 py-3 text-sm font-semibold text-white'
                      : 'flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white'
                  }
                >
                  <Settings size={16} />
                  Entrar na area admin
                </NavLink>
              )}
            </div>
          </div>
        )}
      </header>

      <main
        className={
          salesMode
            ? 'mx-auto w-full max-w-[1550px] px-0 py-0'
            : 'mx-auto w-full max-w-[1400px] px-4 py-6 sm:px-6 sm:py-8'
        }
      >
        <Outlet />
      </main>

      <footer
        className={
          salesMode
            ? 'border-t border-fuchsia-900/40 bg-[#10071a]/88'
            : 'border-t border-slate-200/80 bg-white/85'
        }
      >
        <div
          className={
            salesMode
              ? 'mx-auto flex w-full max-w-[1400px] flex-col gap-2 px-4 py-6 text-sm text-fuchsia-100/80 sm:flex-row sm:items-center sm:justify-between sm:px-6'
              : 'mx-auto flex w-full max-w-[1400px] flex-col gap-2 px-4 py-6 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between sm:px-6'
          }
        >
          <div className="flex items-center gap-2.5">
            <img
              src={brandLogoUrl}
              alt="Logomarca Cecilia"
              className={
                salesMode
                  ? 'h-9 w-9 rounded-md border border-fuchsia-500/35 bg-black object-contain p-1'
                  : 'h-9 w-9 rounded-md border border-slate-200 bg-black object-contain p-1'
              }
            />
            <span className={salesMode ? 'font-semibold text-fuchsia-50' : 'font-semibold text-slate-700'}>
              CECILIA CAMA MESA E BANHO
            </span>
          </div>
          <span>Contato: (79) 9 9651-3935</span>
        </div>
      </footer>
    </div>
  )
}

export default Layout
