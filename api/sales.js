import { authenticateRequest } from './_lib/auth.js'
import { registerDeviceAccess } from './_lib/devices.js'
import { sendError, sendJson, readJsonBody } from './_lib/http.js'
import { cancelSale, createSale, getSaleById, listSales, updateSale } from './_lib/sales.js'

const actionPermissions = {
  list: ['ver_vendas', 'vender', 'dashboard', 'relatorios'],
  get: ['ver_vendas', 'vender', 'dashboard', 'relatorios'],
  create: ['vender'],
  update: ['ver_vendas'],
  cancel: ['ver_vendas'],
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    sendError(res, 405, 'Metodo nao permitido.', 'METHOD_NOT_ALLOWED')
    return
  }

  try {
    const body = await readJsonBody(req)
    const action = String(body.action || '').trim()

    if (!action || !actionPermissions[action]) {
      sendError(res, 400, 'Acao invalida.', 'INVALID_ACTION')
      return
    }

    const auth = await authenticateRequest(req, actionPermissions[action])

    if (!auth.ok) {
      sendError(res, auth.status, auth.message, auth.code)
      return
    }

    const deviceId = String(req.headers['x-device-id'] || '').trim()
    const deviceName = String(req.headers['x-device-name'] || '').trim()

    if (deviceId) {
      await registerDeviceAccess({
        userId: auth.user.id,
        deviceId,
        deviceName,
      })
    }

    if (action === 'list') {
      const sales = await listSales()
      sendJson(res, 200, {
        ok: true,
        data: sales,
        session: { user: auth.safeUser },
      })
      return
    }

    if (action === 'get') {
      const saleId = String(body.saleId || '').trim()
      if (!saleId) {
        sendError(res, 400, 'saleId e obrigatorio.', 'INVALID_INPUT')
        return
      }

      const sale = await getSaleById(saleId)
      if (!sale) {
        sendError(res, 404, 'Venda nao encontrada.', 'NOT_FOUND')
        return
      }

      sendJson(res, 200, {
        ok: true,
        data: sale,
        session: { user: auth.safeUser },
      })
      return
    }

    if (action === 'create') {
      const sale = await createSale({
        payload: body.payload || {},
        actor: auth.user,
      })

      sendJson(res, 200, {
        ok: true,
        data: sale,
        session: { user: auth.safeUser },
      })
      return
    }

    if (action === 'update') {
      const saleId = String(body.saleId || '').trim()
      if (!saleId) {
        sendError(res, 400, 'saleId e obrigatorio.', 'INVALID_INPUT')
        return
      }

      const sale = await updateSale({
        saleId,
        payload: body.payload || {},
        actor: auth.user,
      })

      sendJson(res, 200, {
        ok: true,
        data: sale,
        session: { user: auth.safeUser },
      })
      return
    }

    if (action === 'cancel') {
      const saleId = String(body.saleId || '').trim()
      if (!saleId) {
        sendError(res, 400, 'saleId e obrigatorio.', 'INVALID_INPUT')
        return
      }

      const sale = await cancelSale({
        saleId,
        reason: String(body.reason || '').trim(),
        actor: auth.user,
      })

      sendJson(res, 200, {
        ok: true,
        data: sale,
        session: { user: auth.safeUser },
      })
      return
    }
  } catch (error) {
    sendError(res, 500, error.message || 'Erro ao processar vendas.', 'SALES_ERROR')
  }
}
