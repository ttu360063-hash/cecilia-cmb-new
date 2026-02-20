
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

const STORAGE_PREFIX = 'cecilia_local_db_v1'
const MEMORY_DB: Partial<Record<EntityName, EntityRecord[]>> = {}

const STORAGE_KEYS: Record<EntityName, string> = {
  products: `${STORAGE_PREFIX}_products`,
  sales: `${STORAGE_PREFIX}_sales`,
  customers: `${STORAGE_PREFIX}_customers`,
  payment_methods: `${STORAGE_PREFIX}_payment_methods`,
  expenses: `${STORAGE_PREFIX}_expenses`,
}

const nowIso = () => new Date().toISOString()

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value))

const hasLocalStorage = (): boolean =>
  typeof window !== 'undefined' && typeof window.localStorage !== 'undefined'

const normalizeProduct = (record: EntityRecord): EntityRecord => {
  const unitPrice = toNumber(record.unitPrice ?? record.price, 0)
  const stockQuantity = toNumber(record.stockQuantity ?? record.stock, 0)

  return {
    ...record,
    unitPrice,
    stockQuantity,
    price: unitPrice,
    stock: stockQuantity,
    active: record.active !== false,
  }
}

const normalizeCustomer = (record: EntityRecord): EntityRecord => ({
  ...record,
  active: record.active !== false,
})

const normalizePaymentMethod = (record: EntityRecord): EntityRecord => ({
  ...record,
  active: record.active !== false,
  order: Number.isFinite(Number(record.order)) ? Number(record.order) : 0,
})

const normalizeSale = (record: EntityRecord): EntityRecord => {
  const items = Array.isArray(record.items)
    ? record.items
    : Array.isArray(record.products)
      ? record.products
      : []

  const total = toNumber(record.total ?? record.totalValue, 0)

  return {
    ...record,
    items,
    products: Array.isArray(record.products) ? record.products : items,
    total,
    totalValue: record.totalValue ?? total,
    active: record.active !== false,
  }
}

const normalizeByEntity = (entity: EntityName, record: EntityRecord): EntityRecord => {
  switch (entity) {
    case 'products':
      return normalizeProduct(record)
    case 'customers':
      return normalizeCustomer(record)
    case 'payment_methods':
      return normalizePaymentMethod(record)
    case 'sales':
      return normalizeSale(record)
    default:
      return record
  }
}

const ensureId = (record: EntityRecord): EntityRecord => {
  const existingId = String(record._id ?? record.id ?? '').trim()
  const id = existingId || generateId()
  return {
    ...record,
    _id: id,
    id,
  }
}

const generateId = (): string => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  const random = Math.random().toString(36).slice(2, 10)
  return `${Date.now()}_${random}`
}

const toNumber = (value: any, fallback: number = 0): number => {
  const numeric = Number(value)
  return Number.isFinite(numeric) ? numeric : fallback
}

const getSeedData = (entity: EntityName): EntityRecord[] => {
  if (entity !== 'payment_methods') {
    return []
  }

  const createdAt = nowIso()
  return [
    { _id: 'pm_dinheiro', id: 'pm_dinheiro', name: 'Dinheiro', value: 'dinheiro', active: true, order: 1, createdAt, updatedAt: createdAt },
    { _id: 'pm_pix', id: 'pm_pix', name: 'PIX', value: 'pix', active: true, order: 2, createdAt, updatedAt: createdAt },
    { _id: 'pm_cartao_debito', id: 'pm_cartao_debito', name: 'Cartao Debito', value: 'cartao_debito', active: true, order: 3, createdAt, updatedAt: createdAt },
    { _id: 'pm_cartao_credito', id: 'pm_cartao_credito', name: 'Cartao Credito', value: 'cartao_credito', active: true, order: 4, createdAt, updatedAt: createdAt },
    { _id: 'pm_transferencia', id: 'pm_transferencia', name: 'Transferencia', value: 'transferencia', active: true, order: 5, createdAt, updatedAt: createdAt },
    { _id: 'pm_boleto', id: 'pm_boleto', name: 'Boleto', value: 'boleto', active: true, order: 6, createdAt, updatedAt: createdAt },
  ]
}

const readEntity = (entity: EntityName): EntityRecord[] => {
  if (!hasLocalStorage()) {
    if (!MEMORY_DB[entity]) {
      MEMORY_DB[entity] = getSeedData(entity)
    }
    return clone(MEMORY_DB[entity] || [])
  }

  const key = STORAGE_KEYS[entity]
  const raw = window.localStorage.getItem(key)
  if (!raw) {
    const seed = getSeedData(entity)
    writeEntity(entity, seed)
    return clone(seed)
  }

  try {
    const parsed = JSON.parse(raw)
    if (Array.isArray(parsed)) {
      return clone(parsed)
    }
  } catch (error) {
    console.warn(`Falha ao ler dados locais de ${entity}:`, error)
  }

  const seed = getSeedData(entity)
  writeEntity(entity, seed)
  return clone(seed)
}

const writeEntity = (entity: EntityName, records: EntityRecord[]): void => {
  if (!hasLocalStorage()) {
    MEMORY_DB[entity] = clone(records)
    return
  }

  const key = STORAGE_KEYS[entity]
  window.localStorage.setItem(key, JSON.stringify(records))
}

const compareValues = (a: any, b: any): number => {
  if (a === b) return 0
  if (a === undefined || a === null) return 1
  if (b === undefined || b === null) return -1

  if (typeof a === 'boolean' || typeof b === 'boolean') {
    return Number(Boolean(a)) - Number(Boolean(b))
  }

  const numberA = Number(a)
  const numberB = Number(b)
  if (Number.isFinite(numberA) && Number.isFinite(numberB)) {
    return numberA - numberB
  }

  const dateA = Date.parse(String(a))
  const dateB = Date.parse(String(b))
  if (!Number.isNaN(dateA) && !Number.isNaN(dateB)) {
    return dateA - dateB
  }

  return String(a).localeCompare(String(b), 'pt-BR', { sensitivity: 'base' })
}

const applyFilter = (records: EntityRecord[], filter?: Record<string, any>): EntityRecord[] => {
  if (!filter || Object.keys(filter).length === 0) {
    return records
  }

  return records.filter((record) =>
    Object.entries(filter).every(([key, expected]) => record[key] === expected),
  )
}

const applySort = (records: EntityRecord[], sort?: Record<string, number>): EntityRecord[] => {
  if (!sort || Object.keys(sort).length === 0) {
    return records
  }

  const entries = Object.entries(sort)
  return [...records].sort((left, right) => {
    for (const [field, orderRaw] of entries) {
      const order = orderRaw === -1 ? -1 : 1
      const compared = compareValues(left[field], right[field])
      if (compared !== 0) {
        return compared * order
      }
    }
    return 0
  })
}

const applyLimit = (records: EntityRecord[], limit?: number): EntityRecord[] => {
  if (typeof limit !== 'number' || !Number.isFinite(limit) || limit <= 0) {
    return records
  }
  return records.slice(0, limit)
}

const createEntityApi = (entity: EntityName): EntityApi => ({
  list: async (options: ListOptions = {}) => {
    const rawRecords = readEntity(entity)
      .map((record) => ensureId(normalizeByEntity(entity, record)))

    const filtered = applyFilter(rawRecords, options.filter)
    const sorted = applySort(filtered, options.sort)
    const limited = applyLimit(sorted, options.limit)

    return {
      list: clone(limited),
      total: filtered.length,
    }
  },

  create: async (data: Partial<EntityRecord>) => {
    const records = readEntity(entity)
    const timestamp = nowIso()
    const createdRecord = ensureId(
      normalizeByEntity(entity, {
        active: true,
        createdAt: data.createdAt ?? timestamp,
        updatedAt: data.updatedAt ?? timestamp,
        ...data,
      }),
    )

    records.push(createdRecord)
    writeEntity(entity, records)
    return clone(createdRecord)
  },

  update: async (id: string, updates: Partial<EntityRecord>) => {
    const targetId = String(id || '').trim()
    if (!targetId) {
      throw new Error('ID invalido para atualizacao')
    }

    const records = readEntity(entity)
    const index = records.findIndex((record) => String(record._id ?? record.id) === targetId)
    if (index === -1) {
      throw new Error(`Registro nao encontrado para ID ${targetId}`)
    }

    const current = ensureId(normalizeByEntity(entity, records[index]))
    const updated = ensureId(
      normalizeByEntity(entity, {
        ...current,
        ...updates,
        _id: current._id,
        id: current.id,
        createdAt: current.createdAt ?? updates.createdAt ?? nowIso(),
        updatedAt: updates.updatedAt ?? nowIso(),
      }),
    )

    records[index] = updated
    writeEntity(entity, records)
    return clone(updated)
  },

  delete: async (id: string) => {
    const targetId = String(id || '').trim()
    if (!targetId) {
      throw new Error('ID invalido para exclusao')
    }

    const records = readEntity(entity)
    const index = records.findIndex((record) => String(record._id ?? record.id) === targetId)
    if (index === -1) {
      return { success: false }
    }

    records.splice(index, 1)
    writeEntity(entity, records)
    return { success: true }
  },
})

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
