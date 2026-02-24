import { apiRequest } from './auth'

type EntityName = 'products' | 'sales' | 'customers' | 'payment_methods' | 'expenses'
type EntityRecord = Record<string, any>

type ListOptions = {
  filter?: Record<string, any>
  sort?: Record<string, number>
  limit?: number
}

type ListResponse<T extends EntityRecord = EntityRecord> = {
  list: T[]
  total: number
}

type EntityApi<T extends EntityRecord = EntityRecord> = {
  list: (options?: ListOptions) => Promise<ListResponse<T>>
  create: (data: Partial<T>) => Promise<T>
  update: (id: string, updates: Partial<T>) => Promise<T>
  delete: (id: string) => Promise<{ success: boolean }>
}

type LumiLikeClient = {
  entities: Record<string, EntityApi>
}

const ENTITY_ALIAS: Record<string, EntityName> = {
  products: 'products',
  sales: 'sales',
  customers: 'customers',
  customer: 'customers',
  clientes: 'customers',
  cliente: 'customers',
  payment_methods: 'payment_methods',
  expenses: 'expenses',
}

const normalizeEntityName = (entityName: string): EntityName => {
  const normalized = ENTITY_ALIAS[entityName.toLowerCase()]
  if (!normalized) {
    throw new Error(`Entidade n?o suportada: ${entityName}`)
  }
  return normalized
}

const normalizePaymentMethod = (record: EntityRecord): EntityRecord => ({
  ...record,
  active: record.active !== false,
  order: Number.isFinite(Number(record.order)) ? Number(record.order) : 0,
})

const normalizeProduct = (record: EntityRecord): EntityRecord => {
  const unitPrice = Number(record.unitPrice ?? record.price ?? 0)
  const stockQuantity = Number(record.stockQuantity ?? record.stock ?? 0)

  return {
    ...record,
    unitPrice: Number.isFinite(unitPrice) ? unitPrice : 0,
    stockQuantity: Number.isFinite(stockQuantity) ? stockQuantity : 0,
    price: Number.isFinite(unitPrice) ? unitPrice : 0,
    stock: Number.isFinite(stockQuantity) ? stockQuantity : 0,
    active: record.active !== false,
  }
}

const normalizeSale = (record: EntityRecord): EntityRecord => {
  const items = Array.isArray(record.items)
    ? record.items
    : Array.isArray(record.products)
      ? record.products
      : []

  const total = Number(record.total ?? record.totalValue ?? 0)

  return {
    ...record,
    items,
    products: Array.isArray(record.products) ? record.products : items,
    total: Number.isFinite(total) ? total : 0,
    totalValue: Number.isFinite(total) ? total : 0,
    active: record.active !== false,
  }
}

const normalizeByEntity = (entity: EntityName, record: EntityRecord): EntityRecord => {
  switch (entity) {
    case 'products':
      return normalizeProduct(record)
    case 'sales':
      return normalizeSale(record)
    case 'payment_methods':
      return normalizePaymentMethod(record)
    default:
      return { ...record, active: record.active !== false }
  }
}

const createEntityApi = (entityName: string): EntityApi => {
  const entity = normalizeEntityName(entityName)

  return {
    list: async (options: ListOptions = {}) => {
      const response = await apiRequest<{ ok: true; data: ListResponse }>('/api/entities', {
        method: 'POST',
        body: JSON.stringify({
          action: 'list',
          entity,
          options,
        }),
      })

      return {
        list: (response.data.list || []).map((record) => normalizeByEntity(entity, record)),
        total: response.data.total || 0,
      }
    },

    create: async (data: Partial<EntityRecord>) => {
      const response = await apiRequest<{ ok: true; data: EntityRecord }>('/api/entities', {
        method: 'POST',
        body: JSON.stringify({
          action: 'create',
          entity,
          data,
        }),
      })

      return normalizeByEntity(entity, response.data)
    },

    update: async (id: string, updates: Partial<EntityRecord>) => {
      const response = await apiRequest<{ ok: true; data: EntityRecord }>('/api/entities', {
        method: 'POST',
        body: JSON.stringify({
          action: 'update',
          entity,
          id,
          data: updates,
        }),
      })

      return normalizeByEntity(entity, response.data)
    },

    delete: async (id: string) => {
      const response = await apiRequest<{ ok: true; data: { success: boolean } }>('/api/entities', {
        method: 'POST',
        body: JSON.stringify({
          action: 'delete',
          entity,
          id,
        }),
      })

      return response.data
    },
  }
}

const customersEntity = createEntityApi('customers')

export const lumi: LumiLikeClient = {
  entities: {
    products: createEntityApi('products'),
    sales: createEntityApi('sales'),
    customers: customersEntity,
    customer: customersEntity,
    clientes: customersEntity,
    cliente: customersEntity,
    Customers: customersEntity,
    Customer: customersEntity,
    Clientes: customersEntity,
    Cliente: customersEntity,
    CUSTOMERS: customersEntity,
    CUSTOMER: customersEntity,
    CLIENTES: customersEntity,
    CLIENTE: customersEntity,
    payment_methods: createEntityApi('payment_methods'),
    expenses: createEntityApi('expenses'),
  },
}
