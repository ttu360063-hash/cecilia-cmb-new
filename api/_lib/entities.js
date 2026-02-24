import { randomUUID } from 'crypto'
import { requiredEntityPermissions } from './permissions.js'
import { getSupabaseAdmin } from './supabase.js'

const nowIso = () => new Date().toISOString()

const toNumber = (value, fallback = 0) => {
  const numeric = Number(value)
  return Number.isFinite(numeric) ? numeric : fallback
}

const normalizeProduct = (record) => {
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

const normalizeCustomer = (record) => ({
  ...record,
  active: record.active !== false,
})

const normalizePaymentMethod = (record) => ({
  ...record,
  active: record.active !== false,
  order: Number.isFinite(Number(record.order)) ? Number(record.order) : 0,
})

const normalizeSale = (record) => {
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

const normalizeByEntity = (entity, record) => {
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

const compareValues = (a, b) => {
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

const applyFilter = (records, filter = {}) => {
  if (!filter || Object.keys(filter).length === 0) {
    return records
  }

  return records.filter((record) =>
    Object.entries(filter).every(([key, expected]) => record[key] === expected),
  )
}

const applySort = (records, sort = {}) => {
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

const applyLimit = (records, limit) => {
  if (typeof limit !== 'number' || !Number.isFinite(limit) || limit <= 0) {
    return records
  }

  return records.slice(0, limit)
}

const toApiRecord = (entity, row) =>
  normalizeByEntity(entity, {
    ...(row.data || {}),
    _id: row.id,
    id: row.id,
    createdAt: row.data?.createdAt ?? row.created_at ?? nowIso(),
    updatedAt: row.data?.updatedAt ?? row.updated_at ?? nowIso(),
  })

const toDbPayload = (record) => {
  const payload = { ...record }
  delete payload._id
  delete payload.id
  return payload
}

const paymentMethodSeed = () => {
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

const ensurePaymentMethodSeed = async (client) => {
  const { count, error } = await client
    .from('payment_methods')
    .select('id', { count: 'exact', head: true })

  if (error) {
    throw error
  }

  if ((count || 0) > 0) {
    return
  }

  const rows = paymentMethodSeed().map((item) => ({
    id: item._id,
    data: toDbPayload(item),
    created_at: item.createdAt,
    updated_at: item.updatedAt,
  }))

  const { error: insertError } = await client
    .from('payment_methods')
    .upsert(rows, { onConflict: 'id' })

  if (insertError) {
    throw insertError
  }
}

const parseDbError = (error) => {
  const message = String(error?.message || 'Erro interno no banco de dados.')
  const code = String(error?.code || '')

  if (code === '42P01') {
    return 'Tabela nao encontrada. Rode o script supabase/schema.sql atualizado.'
  }

  return message
}

export const executeEntityAction = async ({ entity, action, options, id, data }) => {
  const client = getSupabaseAdmin()
  const requiredPermissions = requiredEntityPermissions(entity, action)

  if (!requiredPermissions.length) {
    throw new Error('Entidade ou acao nao permitida.')
  }

  try {
    if (entity === 'payment_methods' && action === 'list') {
      await ensurePaymentMethodSeed(client)
    }

    if (action === 'list') {
      const { data: rows, error } = await client
        .from(entity)
        .select('id,data,created_at,updated_at')

      if (error) {
        throw error
      }

      const allRecords = (rows || []).map((row) => toApiRecord(entity, row))
      const filtered = applyFilter(allRecords, options?.filter)
      const sorted = applySort(filtered, options?.sort)
      const limited = applyLimit(sorted, options?.limit)

      return {
        permissions: requiredPermissions,
        payload: {
          list: limited,
          total: filtered.length,
        },
      }
    }

    if (action === 'create') {
      const recordId = String(data?._id || data?.id || '').trim() || randomUUID()
      const timestamp = nowIso()

      const normalized = normalizeByEntity(entity, {
        active: data?.active ?? true,
        createdAt: data?.createdAt ?? timestamp,
        updatedAt: data?.updatedAt ?? timestamp,
        ...(data || {}),
        _id: recordId,
        id: recordId,
      })

      const row = {
        id: recordId,
        data: toDbPayload(normalized),
        created_at: normalized.createdAt ?? timestamp,
        updated_at: normalized.updatedAt ?? timestamp,
      }

      const { error } = await client.from(entity).upsert(row, { onConflict: 'id' })
      if (error) {
        throw error
      }

      return {
        permissions: requiredPermissions,
        payload: normalized,
      }
    }

    if (action === 'update') {
      const targetId = String(id || '').trim()
      if (!targetId) {
        throw new Error('ID invalido para atualizacao.')
      }

      const { data: row, error: rowError } = await client
        .from(entity)
        .select('id,data,created_at,updated_at')
        .eq('id', targetId)
        .maybeSingle()

      if (rowError) {
        throw rowError
      }

      if (!row) {
        throw new Error('Registro nao encontrado.')
      }

      const currentRecord = toApiRecord(entity, row)
      const updatedRecord = normalizeByEntity(entity, {
        ...currentRecord,
        ...(data || {}),
        _id: targetId,
        id: targetId,
        createdAt: currentRecord.createdAt ?? nowIso(),
        updatedAt: data?.updatedAt ?? nowIso(),
      })

      const updatedRow = {
        id: targetId,
        data: toDbPayload(updatedRecord),
        created_at: updatedRecord.createdAt,
        updated_at: updatedRecord.updatedAt,
      }

      const { error } = await client.from(entity).upsert(updatedRow, { onConflict: 'id' })
      if (error) {
        throw error
      }

      return {
        permissions: requiredPermissions,
        payload: updatedRecord,
      }
    }

    if (action === 'delete') {
      const targetId = String(id || '').trim()
      if (!targetId) {
        throw new Error('ID invalido para exclusao.')
      }

      const { error } = await client.from(entity).delete().eq('id', targetId)
      if (error) {
        throw error
      }

      return {
        permissions: requiredPermissions,
        payload: { success: true },
      }
    }

    throw new Error('Acao nao suportada.')
  } catch (error) {
    throw new Error(parseDbError(error))
  }
}
