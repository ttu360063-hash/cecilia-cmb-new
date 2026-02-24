export const ALL_PERMISSIONS = [
  'vender',
  'ver_vendas',
  'produtos',
  'clientes',
  'dashboard',
  'relatorios',
  'configuracoes',
  'usuarios',
]

export const DEFAULT_ADMIN = {
  name: 'Matheus',
  username: 'matheus',
  password: 'areazinho',
  role: 'administrador',
  permissions: ALL_PERMISSIONS,
}

export const ENTITY_NAMES = ['products', 'sales', 'customers', 'payment_methods', 'expenses']

export const ENTITY_PERMISSION_RULES = {
  products: {
    list: ['produtos', 'dashboard', 'relatorios', 'vender'],
    create: ['produtos'],
    update: ['produtos'],
    delete: ['produtos'],
  },
  sales: {
    list: ['ver_vendas', 'dashboard', 'relatorios', 'vender'],
    create: ['vender'],
    update: ['ver_vendas'],
    delete: ['ver_vendas'],
  },
  customers: {
    list: ['clientes', 'dashboard', 'relatorios', 'vender', 'ver_vendas'],
    create: ['clientes', 'vender'],
    update: ['clientes'],
    delete: ['clientes'],
  },
  payment_methods: {
    list: ['configuracoes', 'vender'],
    create: ['configuracoes'],
    update: ['configuracoes'],
    delete: ['configuracoes'],
  },
  expenses: {
    list: ['configuracoes', 'dashboard', 'relatorios'],
    create: ['configuracoes'],
    update: ['configuracoes'],
    delete: ['configuracoes'],
  },
}
