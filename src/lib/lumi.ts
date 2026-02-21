
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

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

type DbRow = {
  id: string
  data: EntityRecord
  created_at: string | null
  updated_at: string | null
}

const SUPABASE_URL = String(import.meta.env.VITE_SUPABASE_URL || '').trim()
const SUPABASE_ANON_KEY = String(import.meta.env.VITE_SUPABASE_ANON_KEY || '').trim()

const supabase: SupabaseClient | null =
  SUPABASE_URL && SUPABASE_ANON_KEY
    ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        auth: {
          persistSession: false,
        },
      })
    : null

const nowIso = () => new Date().toISOString()

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value))

const assertSupabase = (): SupabaseClient => {
  if (!supabase) {
    throw new Error(
      'Supabase nao configurado. Defina VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY.',
    )
  }
  return supabase
}

const toNumber = (value: any, fallback: number = 0): number => {
  const numeric = Number(value)
  return Number.isFinite(numeric) ? numeric : fallback
}

const generateId = (): string => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  const random = Math.random().toString(36).slice(2, 10)
  return `${Date.now()}_${random}`
}

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

const toApiRecord = (entity: EntityName, row: DbRow): EntityRecord =>
  normalizeByEntity(entity, {
    ...(row.data || {}),
    _id: row.id,
    id: row.id,
    createdAt: row.data?.createdAt ?? row.created_at ?? nowIso(),
    updatedAt: row.data?.updatedAt ?? row.updated_at ?? nowIso(),
  })

const toDbPayload = (record: EntityRecord): EntityRecord => {
  const payload = { ...record }
  delete payload._id
  delete payload.id
  return payload
}

const getPaymentMethodSeed = (): EntityRecord[] => {
  const timestamp = nowIso()
  return [
    {
      _id: 'pm_dinheiro',
      id: 'pm_dinheiro',
      name: 'Dinheiro',
      value: 'dinheiro',
      active: true,
      order: 1,
      createdAt: timestamp,
      updatedAt: timestamp,
    },
    {
      _id: 'pm_pix',
      id: 'pm_pix',
      name: 'PIX',
      value: 'pix',
      active: true,
      order: 2,
      createdAt: timestamp,
      updatedAt: timestamp,
    },
    {
      _id: 'pm_cartao_debito',
      id: 'pm_cartao_debito',
      name: 'Cartao Debito',
      value: 'cartao_debito',
      active: true,
      order: 3,
      createdAt: timestamp,
      updatedAt: timestamp,
    },
    {
      _id: 'pm_cartao_credito',
      id: 'pm_cartao_credito',
      name: 'Cartao Credito',
      value: 'cartao_credito',
      active: true,
      order: 4,
      createdAt: timestamp,
      updatedAt: timestamp,
    },
    {
      _id: 'pm_transferencia',
      id: 'pm_transferencia',
      name: 'Transferencia',
      value: 'transferencia',
      active: true,
      order: 5,
      createdAt: timestamp,
      updatedAt: timestamp,
    },
    {
      _id: 'pm_boleto',
      id: 'pm_boleto',
      name: 'Boleto',
      value: 'boleto',
      active: true,
      order: 6,
      createdAt: timestamp,
      updatedAt: timestamp,
    },
  ]
}

const ensurePaymentMethodSeed = async (client: SupabaseClient) => {
  const { count, error } = await client
    .from('payment_methods')
    .select('id', { count: 'exact', head: true })

  if (error) {
    throw error
  }
  if ((count || 0) > 0) {
    return
  }

  const seedRows = getPaymentMethodSeed().map((item) => ({
    id: item._id,
    data: toDbPayload(item),
    created_at: item.createdAt,
    updated_at: item.updatedAt,
  }))

  const { error: insertError } = await client
    .from('payment_methods')
    .upsert(seedRows, { onConflict: 'id' })

  if (insertError) {
    throw insertError
  }
}

const createEntityApi = (entity: EntityName): EntityApi => ({
  list: async (options: ListOptions = {}) => {
    const client = assertSupabase()

    if (entity === 'payment_methods') {
      await ensurePaymentMethodSeed(client)
    }

    const { data, error } = await client
      .from(entity)
      .select('id,data,created_at,updated_at')

    if (error) {
      throw new Error(error.message)
    }

    const rawRecords = ((data || []) as DbRow[]).map((row) => toApiRecord(entity, row))
    const filtered = applyFilter(rawRecords, options.filter)
    const sorted = applySort(filtered, options.sort)
    const limited = applyLimit(sorted, options.limit)

    return {
      list: clone(limited),
      total: filtered.length,
    }
  },

  create: async (data: Partial<EntityRecord>) => {
    const client = assertSupabase()
    const id = String(data._id ?? data.id ?? '').trim() || generateId()
    const timestamp = nowIso()

    const normalized = normalizeByEntity(entity, {
      active: data.active ?? true,
      createdAt: data.createdAt ?? timestamp,
      updatedAt: data.updatedAt ?? timestamp,
      ...data,
      _id: id,
      id,
    })

    const row = {
      id,
      data: toDbPayload(normalized),
      created_at: normalized.createdAt ?? timestamp,
      updated_at: normalized.updatedAt ?? timestamp,
    }

    const { error } = await client.from(entity).upsert(row, { onConflict: 'id' })
    if (error) {
      throw new Error(error.message)
    }

    return clone(normalized)
  },

  update: async (id: string, updates: Partial<EntityRecord>) => {
    const client = assertSupabase()
    const targetId = String(id || '').trim()
    if (!targetId) {
      throw new Error('ID invalido para atualizacao')
    }

    const { data: currentRow, error: currentError } = await client
      .from(entity)
      .select('id,data,created_at,updated_at')
      .eq('id', targetId)
      .maybeSingle()

    if (currentError) {
      throw new Error(currentError.message)
    }
    if (!currentRow) {
      throw new Error(`Registro nao encontrado para ID ${targetId}`)
    }

    const current = toApiRecord(entity, currentRow as DbRow)
    const updated = normalizeByEntity(entity, {
      ...current,
      ...updates,
      _id: targetId,
      id: targetId,
      createdAt: current.createdAt ?? nowIso(),
      updatedAt: updates.updatedAt ?? nowIso(),
    })

    const row = {
      id: targetId,
      data: toDbPayload(updated),
      created_at: updated.createdAt ?? nowIso(),
      updated_at: updated.updatedAt ?? nowIso(),
    }

    const { error } = await client.from(entity).upsert(row, { onConflict: 'id' })
    if (error) {
      throw new Error(error.message)
    }

    return clone(updated)
  },

  delete: async (id: string) => {
    const client = assertSupabase()
    const targetId = String(id || '').trim()
    if (!targetId) {
      throw new Error('ID invalido para exclusao')
    }

    const { error } = await client.from(entity).delete().eq('id', targetId)
    if (error) {
      throw new Error(error.message)
    }

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
