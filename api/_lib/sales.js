import { randomUUID } from 'crypto'
import { getSupabaseAdmin } from './supabase.js'

export const SALE_STATUS = {
  OPEN: 'em_aberto',
  DONE: 'concluida',
  CANCELED: 'cancelada',
}

const nowIso = () => new Date().toISOString()

const normalizeText = (value, fallback = '') => {
  if (value === null || value === undefined) {
    return fallback
  }
  return String(value).trim()
}

const normalizeComparable = (value) =>
  normalizeText(value)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')

const normalizeNumber = (value, fallback = 0) => {
  const numeric = Number(value)
  return Number.isFinite(numeric) ? numeric : fallback
}

const toIsoDate = (value) => {
  const text = normalizeText(value)
  if (!text) {
    return nowIso()
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) {
    return new Date(`${text}T00:00:00`).toISOString()
  }

  const parsed = new Date(text)
  if (Number.isNaN(parsed.getTime())) {
    return nowIso()
  }

  return parsed.toISOString()
}

export const normalizeSaleStatus = (value) => {
  const normalized = normalizeComparable(value)

  if (!normalized) {
    return SALE_STATUS.OPEN
  }

  if (
    normalized === 'em_aberto' ||
    normalized === 'aberta' ||
    normalized === 'aberto' ||
    normalized === 'open' ||
    normalized === 'pendente' ||
    normalized === 'em_andamento' ||
    normalized === 'em andamento'
  ) {
    return SALE_STATUS.OPEN
  }

  if (
    normalized === 'concluida' ||
    normalized === 'finalizada' ||
    normalized === 'entregue' ||
    normalized === 'done'
  ) {
    return SALE_STATUS.DONE
  }

  if (normalized === 'cancelada' || normalized === 'cancelado' || normalized === 'canceled') {
    return SALE_STATUS.CANCELED
  }

  return SALE_STATUS.OPEN
}

const normalizeSaleItems = (items) => {
  if (!Array.isArray(items)) {
    return []
  }

  return items
    .map((item) => {
      const productId = normalizeText(item?.productId || item?.product_id || item?.id)
      const productName = normalizeText(item?.productName || item?.product_name || item?.name)
      const quantity = Math.max(1, Math.floor(normalizeNumber(item?.quantity, 1)))
      const unitPrice = Math.max(0, normalizeNumber(item?.unitPrice ?? item?.price, 0))
      const total = Math.max(0, normalizeNumber(item?.total ?? item?.totalPrice, quantity * unitPrice))

      if (!productId) {
        return null
      }

      return {
        productId,
        productName: productName || 'Produto sem nome',
        quantity,
        unitPrice,
        total,
        totalPrice: total,
      }
    })
    .filter(Boolean)
}

const buildQtyMap = (items) => {
  const map = new Map()

  for (const item of items || []) {
    const productId = normalizeText(item?.productId)
    if (!productId) {
      continue
    }

    const quantity = Math.max(0, Math.floor(normalizeNumber(item?.quantity, 0)))
    const current = map.get(productId) || 0
    map.set(productId, current + quantity)
  }

  return map
}

const rowToSale = (row) => {
  const data = row?.data || {}
  const status = normalizeSaleStatus(data.status)
  const itemsSource = Array.isArray(data.items)
    ? data.items
    : Array.isArray(data.products)
      ? data.products
      : []
  const items = normalizeSaleItems(itemsSource)
  const subtotalValue = normalizeNumber(
    data.subtotalValue,
    items.reduce((sum, item) => sum + normalizeNumber(item.total, 0), 0),
  )
  const discountValue = normalizeNumber(data.discountValue, 0)
  const additionalValue = normalizeNumber(data.additionalValue, 0)

  const customerSnapshot = data.customer || {
    name: data.customerName || '',
    phone: data.customerPhone || '',
    email: data.customerEmail || '',
    address: data.customerAddress || '',
  }

  return {
    ...data,
    _id: row.id,
    id: row.id,
    customerId: data.customerId || null,
    customer: {
      name: normalizeText(customerSnapshot.name, normalizeText(data.customerName)),
      phone: normalizeText(customerSnapshot.phone, normalizeText(data.customerPhone)),
      email: normalizeText(customerSnapshot.email, normalizeText(data.customerEmail)),
      address: normalizeText(customerSnapshot.address, normalizeText(data.customerAddress)),
    },
    customerName: normalizeText(data.customerName, normalizeText(customerSnapshot.name)),
    customerPhone: normalizeText(data.customerPhone, normalizeText(customerSnapshot.phone)),
    customerEmail: normalizeText(data.customerEmail, normalizeText(customerSnapshot.email)),
    customerAddress: normalizeText(data.customerAddress, normalizeText(customerSnapshot.address)),
    sellerName: normalizeText(data.sellerName || data.vendorName || data.vendedor || ''),
    items,
    products: items,
    subtotalValue,
    discountValue,
    additionalValue,
    total: normalizeNumber(data.total ?? data.totalValue, subtotalValue - discountValue + additionalValue),
    totalValue: normalizeNumber(data.totalValue ?? data.total, subtotalValue - discountValue + additionalValue),
    paymentMethod: normalizeText(data.paymentMethod),
    status,
    observations: normalizeText(data.observations),
    saleNumber: Number.isFinite(Number(data.saleNumber)) ? Number(data.saleNumber) : null,
    date: toIsoDate(data.date || data.saleDate || row.created_at || nowIso()),
    saleDate: toIsoDate(data.saleDate || data.date || row.created_at || nowIso()),
    createdAt: data.createdAt || row.created_at || nowIso(),
    updatedAt: data.updatedAt || row.updated_at || nowIso(),
    editHistory: Array.isArray(data.editHistory) ? data.editHistory : [],
    canceledAt: data.canceledAt || null,
    cancelReason: data.cancelReason || null,
    active: data.active !== false,
  }
}

const saleToRow = (sale) => {
  const createdAt = sale.createdAt || nowIso()
  const updatedAt = sale.updatedAt || nowIso()

  return {
    id: sale.id,
    data: {
      ...sale,
      _id: sale.id,
      id: sale.id,
      createdAt,
      updatedAt,
    },
    created_at: createdAt,
    updated_at: updatedAt,
  }
}

const findNextSaleNumber = async (client) => {
  const { data, error } = await client.from('sales').select('data')
  if (error) {
    throw error
  }

  const maxValue = (data || []).reduce((maxNumber, row) => {
    const current = Number(row?.data?.saleNumber)
    if (Number.isFinite(current) && current > maxNumber) {
      return current
    }
    return maxNumber
  }, 0)

  return maxValue + 1
}

const normalizeSaleInput = async ({ payload, currentSale, client }) => {
  const source = payload || {}
  const current = currentSale || {}

  const items = normalizeSaleItems(source.items || source.products || current.items || current.products || [])
  const subtotalValue = normalizeNumber(
    source.subtotalValue,
    items.reduce((sum, item) => sum + normalizeNumber(item.total, 0), 0),
  )
  const discountValue = normalizeNumber(source.discountValue ?? current.discountValue, 0)
  const additionalValue = normalizeNumber(source.additionalValue ?? current.additionalValue, 0)

  const requestedTotal = normalizeNumber(source.total ?? source.totalValue, Number.NaN)
  const computedTotal = Math.max(0, subtotalValue - discountValue + additionalValue)
  const totalValue = Number.isFinite(requestedTotal) ? requestedTotal : computedTotal

  const customerInput = source.customer || current.customer || {}
  const customer = {
    name: normalizeText(source.customerName, normalizeText(customerInput.name, current.customerName || '')),
    phone: normalizeText(source.customerPhone, normalizeText(customerInput.phone, current.customerPhone || '')),
    email: normalizeText(source.customerEmail, normalizeText(customerInput.email, current.customerEmail || '')),
    address: normalizeText(
      source.customerAddress,
      normalizeText(customerInput.address, current.customerAddress || ''),
    ),
  }

  const normalizedStatus = normalizeSaleStatus(source.status || current.status || SALE_STATUS.OPEN)
  const saleNumber = Number.isFinite(Number(source.saleNumber))
    ? Number(source.saleNumber)
    : Number.isFinite(Number(current.saleNumber))
      ? Number(current.saleNumber)
      : await findNextSaleNumber(client)

  const createdAt = current.createdAt || source.createdAt || nowIso()
  const updatedAt = nowIso()

  return {
    id: normalizeText(current.id || source.id) || randomUUID(),
    saleNumber,
    customerId: normalizeText(source.customerId || current.customerId) || null,
    customer,
    customerName: customer.name,
    customerPhone: customer.phone,
    customerEmail: customer.email,
    customerAddress: customer.address,
    sellerName: normalizeText(source.sellerName || source.vendorName || current.sellerName || ''),
    items,
    products: items,
    subtotalValue,
    discountValue,
    additionalValue,
    total: totalValue,
    totalValue,
    paymentMethod: normalizeText(source.paymentMethod || current.paymentMethod || ''),
    status: normalizedStatus,
    observations: normalizeText(source.observations || current.observations || ''),
    date: toIsoDate(source.date || source.saleDate || current.date || current.saleDate || createdAt),
    saleDate: toIsoDate(source.saleDate || source.date || current.saleDate || current.date || createdAt),
    createdAt,
    updatedAt,
    active: true,
    editHistory: Array.isArray(current.editHistory) ? [...current.editHistory] : [],
    canceledAt: normalizedStatus === SALE_STATUS.CANCELED ? source.canceledAt || current.canceledAt || updatedAt : null,
    cancelReason:
      normalizedStatus === SALE_STATUS.CANCELED
        ? normalizeText(source.cancelReason || current.cancelReason || '')
        : null,
  }
}

const fetchSaleRowById = async (client, saleId) => {
  const { data, error } = await client
    .from('sales')
    .select('id,data,created_at,updated_at')
    .eq('id', saleId)
    .maybeSingle()

  if (error) {
    throw error
  }

  return data || null
}

const fetchProductsByIds = async (client, ids) => {
  if (!ids.length) {
    return new Map()
  }

  const { data, error } = await client
    .from('products')
    .select('id,data,created_at,updated_at')
    .in('id', ids)

  if (error) {
    throw error
  }

  const map = new Map((data || []).map((row) => [row.id, row]))

  for (const id of ids) {
    if (!map.has(id)) {
      throw new Error(`Produto ${id} nao encontrado para atualizacao de estoque.`)
    }
  }

  return map
}

const planStockChanges = async (client, currentSale, nextSale) => {
  const previousStatus = normalizeSaleStatus(currentSale?.status)
  const nextStatus = normalizeSaleStatus(nextSale?.status)

  const previousQtyMap = previousStatus === SALE_STATUS.DONE ? buildQtyMap(currentSale?.items || []) : new Map()
  const nextQtyMap = nextStatus === SALE_STATUS.DONE ? buildQtyMap(nextSale?.items || []) : new Map()

  const ids = [...new Set([...previousQtyMap.keys(), ...nextQtyMap.keys()])]
  const productsMap = await fetchProductsByIds(client, ids)

  const changes = []

  for (const productId of ids) {
    const row = productsMap.get(productId)
    const previousQuantity = previousQtyMap.get(productId) || 0
    const nextQuantity = nextQtyMap.get(productId) || 0

    const currentStock = normalizeNumber(row?.data?.stockQuantity ?? row?.data?.stock, 0)
    const stockAfterRevert = currentStock + previousQuantity
    const finalStock = stockAfterRevert - nextQuantity

    if (finalStock < 0) {
      throw new Error(
        `Estoque insuficiente para o produto ${normalizeText(row?.data?.name, productId)}. Disponivel: ${stockAfterRevert}. Necessario: ${nextQuantity}.`,
      )
    }

    changes.push({
      productId,
      row,
      finalStock,
      previousQuantity,
      nextQuantity,
    })
  }

  return changes
}

const applyStockChanges = async (client, changes) => {
  const applied = []

  for (const change of changes) {
    const { row, finalStock } = change
    const nextData = {
      ...(row.data || {}),
      stock: finalStock,
      stockQuantity: finalStock,
      updatedAt: nowIso(),
    }

    const { error } = await client
      .from('products')
      .update({
        data: nextData,
        updated_at: nowIso(),
      })
      .eq('id', change.productId)

    if (error) {
      throw error
    }

    applied.push(change)
  }

  return applied
}

const rollbackStockChanges = async (client, appliedChanges) => {
  for (const change of appliedChanges || []) {
    try {
      await client
        .from('products')
        .update({
          data: change.row.data,
          updated_at: change.row.updated_at || nowIso(),
        })
        .eq('id', change.productId)
    } catch (_error) {
      // rollback best effort
    }
  }
}

const appendEditHistory = (currentSale, nextSale, actor, reason = '') => {
  if (!currentSale) {
    return nextSale
  }

  const entry = {
    id: randomUUID(),
    editedAt: nowIso(),
    editedBy: actor?.id || null,
    fromStatus: normalizeSaleStatus(currentSale.status),
    toStatus: normalizeSaleStatus(nextSale.status),
    previousTotal: normalizeNumber(currentSale.total, 0),
    nextTotal: normalizeNumber(nextSale.total, 0),
    reason: normalizeText(reason),
  }

  const history = Array.isArray(currentSale.editHistory) ? [...currentSale.editHistory, entry] : [entry]

  return {
    ...nextSale,
    editHistory: history.slice(-80),
  }
}

const persistSaleMutation = async ({ client, currentSale, nextSale, actor, reason }) => {
  const withHistory = appendEditHistory(currentSale, nextSale, actor, reason)
  const stockChanges = await planStockChanges(client, currentSale, withHistory)

  const appliedChanges = []

  try {
    if (stockChanges.length) {
      const applied = await applyStockChanges(client, stockChanges)
      appliedChanges.push(...applied)
    }

    const row = saleToRow(withHistory)
    const { error } = await client.from('sales').upsert(row, { onConflict: 'id' })
    if (error) {
      throw error
    }

    const savedRow = await fetchSaleRowById(client, withHistory.id)
    return rowToSale(savedRow)
  } catch (error) {
    await rollbackStockChanges(client, appliedChanges)
    throw error
  }
}

export const listSales = async () => {
  const client = getSupabaseAdmin()

  const { data, error } = await client.from('sales').select('id,data,created_at,updated_at')
  if (error) {
    throw error
  }

  const sales = (data || [])
    .map((row) => rowToSale(row))
    .sort((left, right) => new Date(right.date).getTime() - new Date(left.date).getTime())

  return sales
}

export const getSaleById = async (saleId) => {
  const client = getSupabaseAdmin()
  const row = await fetchSaleRowById(client, saleId)
  return row ? rowToSale(row) : null
}

export const createSale = async ({ payload, actor }) => {
  const client = getSupabaseAdmin()
  const nextSale = await normalizeSaleInput({ payload, currentSale: null, client })
  const saved = await persistSaleMutation({ client, currentSale: null, nextSale, actor })
  return saved
}

export const updateSale = async ({ saleId, payload, actor }) => {
  const client = getSupabaseAdmin()
  const currentRow = await fetchSaleRowById(client, saleId)
  if (!currentRow) {
    throw new Error('Venda nao encontrada.')
  }

  const currentSale = rowToSale(currentRow)
  const nextSale = await normalizeSaleInput({
    payload: {
      ...(payload || {}),
      id: saleId,
    },
    currentSale,
    client,
  })

  const saved = await persistSaleMutation({
    client,
    currentSale,
    nextSale,
    actor,
    reason: normalizeText(payload?.editReason),
  })

  return saved
}

export const cancelSale = async ({ saleId, reason, actor }) => {
  const client = getSupabaseAdmin()
  const currentRow = await fetchSaleRowById(client, saleId)

  if (!currentRow) {
    throw new Error('Venda nao encontrada.')
  }

  const currentSale = rowToSale(currentRow)
  const nextSale = {
    ...currentSale,
    status: SALE_STATUS.CANCELED,
    cancelReason: normalizeText(reason || currentSale.cancelReason || 'Cancelada manualmente'),
    canceledAt: nowIso(),
    updatedAt: nowIso(),
  }

  const saved = await persistSaleMutation({
    client,
    currentSale,
    nextSale,
    actor,
    reason: normalizeText(reason || 'Cancelamento de venda'),
  })

  return saved
}
