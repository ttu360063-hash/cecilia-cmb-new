import { apiRequest } from './auth'

export const SALE_STATUS = {
  OPEN: 'em_aberto',
  DONE: 'concluida',
  CANCELED: 'cancelada',
} as const

export type SaleStatus = (typeof SALE_STATUS)[keyof typeof SALE_STATUS]

export type SaleItem = {
  productId: string
  productName: string
  quantity: number
  unitPrice: number
  total: number
}

export type SaleRecord = {
  _id: string
  id: string
  saleNumber: number | null
  customerId: string | null
  customer: {
    name: string
    phone: string
    email?: string
    address?: string
  }
  customerName: string
  customerPhone: string
  customerEmail?: string
  customerAddress?: string
  sellerName?: string
  items: SaleItem[]
  products: SaleItem[]
  subtotalValue: number
  discountValue: number
  additionalValue: number
  total: number
  totalValue: number
  paymentMethod?: string
  status: SaleStatus
  observations?: string
  date: string
  saleDate: string
  createdAt: string
  updatedAt: string
  canceledAt?: string | null
  cancelReason?: string | null
  editHistory?: Array<Record<string, any>>
}

const normalizeComparable = (value: string) =>
  String(value || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')

export const normalizeSaleStatus = (value: string): SaleStatus => {
  const normalized = normalizeComparable(value)

  if (!normalized) {
    return SALE_STATUS.OPEN
  }

  if (
    normalized === 'em_aberto' ||
    normalized === 'aberto' ||
    normalized === 'aberta' ||
    normalized === 'pendente' ||
    normalized === 'em_andamento' ||
    normalized === 'em andamento'
  ) {
    return SALE_STATUS.OPEN
  }

  if (
    normalized === 'concluida' ||
    normalized === 'finalizada' ||
    normalized === 'entregue'
  ) {
    return SALE_STATUS.DONE
  }

  if (normalized === 'cancelada' || normalized === 'cancelado') {
    return SALE_STATUS.CANCELED
  }

  return SALE_STATUS.OPEN
}

export const getSaleStatusLabel = (status: string) => {
  const normalized = normalizeSaleStatus(status)
  if (normalized === SALE_STATUS.DONE) {
    return 'Concluida'
  }
  if (normalized === SALE_STATUS.CANCELED) {
    return 'Cancelada'
  }
  return 'Em aberto'
}

export const getSaleStatusBadgeClass = (status: string) => {
  const normalized = normalizeSaleStatus(status)
  if (normalized === SALE_STATUS.DONE) {
    return 'bg-emerald-500/20 text-emerald-200 border border-emerald-400/40'
  }
  if (normalized === SALE_STATUS.CANCELED) {
    return 'bg-rose-500/20 text-rose-200 border border-rose-400/40'
  }
  return 'bg-amber-500/20 text-amber-200 border border-amber-400/40'
}

export const isConcludedSale = (status: string) => normalizeSaleStatus(status) === SALE_STATUS.DONE

export const listSales = async () => {
  const response = await apiRequest<{ ok: true; data: SaleRecord[] }>('/api/sales', {
    method: 'POST',
    body: JSON.stringify({ action: 'list' }),
  })

  return response.data || []
}

export const getSaleById = async (saleId: string) => {
  const response = await apiRequest<{ ok: true; data: SaleRecord }>('/api/sales', {
    method: 'POST',
    body: JSON.stringify({
      action: 'get',
      saleId,
    }),
  })

  return response.data
}

export const createSale = async (payload: Record<string, any>) => {
  const response = await apiRequest<{ ok: true; data: SaleRecord }>('/api/sales', {
    method: 'POST',
    body: JSON.stringify({
      action: 'create',
      payload,
    }),
  })

  return response.data
}

export const updateSale = async (saleId: string, payload: Record<string, any>) => {
  const response = await apiRequest<{ ok: true; data: SaleRecord }>('/api/sales', {
    method: 'POST',
    body: JSON.stringify({
      action: 'update',
      saleId,
      payload,
    }),
  })

  return response.data
}

export const cancelSale = async (saleId: string, reason = '') => {
  const response = await apiRequest<{ ok: true; data: SaleRecord }>('/api/sales', {
    method: 'POST',
    body: JSON.stringify({
      action: 'cancel',
      saleId,
      reason,
    }),
  })

  return response.data
}
