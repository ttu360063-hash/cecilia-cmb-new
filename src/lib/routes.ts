import type { AuthUser, Permission } from './auth'

export const permissionRouteOrder: Array<{ permission: Permission; path: string }> = [
  { permission: 'vender', path: '/vendas' },
  { permission: 'dashboard', path: '/dashboard' },
  { permission: 'ver_vendas', path: '/vendas-lista' },
  { permission: 'produtos', path: '/produtos' },
  { permission: 'clientes', path: '/clientes' },
  { permission: 'relatorios', path: '/relatorios' },
  { permission: 'configuracoes', path: '/pagamentos' },
  { permission: 'usuarios', path: '/usuarios' },
]

export const resolveDefaultRoute = (user: AuthUser | null): string => {
  if (!user) {
    return '/login'
  }

  if ((user.role || '').toLowerCase() === 'administrador') {
    return '/vendas'
  }

  for (const entry of permissionRouteOrder) {
    if (user.permissions.includes(entry.permission)) {
      return entry.path
    }
  }

  return '/acesso-negado'
}
