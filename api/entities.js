import { authenticateRequest } from './_lib/auth.js'
import { registerDeviceAccess } from './_lib/devices.js'
import { executeEntityAction } from './_lib/entities.js'
import { ENTITY_NAMES } from './_lib/constants.js'
import { hasAnyPermission, requiredEntityPermissions } from './_lib/permissions.js'
import { sendError, sendJson, readJsonBody } from './_lib/http.js'

const VALID_ACTIONS = ['list', 'create', 'update', 'delete']

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    sendError(res, 405, 'Metodo nao permitido.', 'METHOD_NOT_ALLOWED')
    return
  }

  try {
    const auth = await authenticateRequest(req)

    if (!auth.ok) {
      sendError(res, auth.status, auth.message, auth.code)
      return
    }

    const body = await readJsonBody(req)
    const action = String(body.action || '').trim()
    const entity = String(body.entity || '').trim()

    if (!VALID_ACTIONS.includes(action)) {
      sendError(res, 400, 'Acao invalida.', 'INVALID_ACTION')
      return
    }

    if (!ENTITY_NAMES.includes(entity)) {
      sendError(res, 400, 'Entidade invalida.', 'INVALID_ENTITY')
      return
    }

    const requiredPermissions = requiredEntityPermissions(entity, action)
    if (!hasAnyPermission(auth.user, requiredPermissions)) {
      sendError(res, 403, 'Sem permissao para essa operacao.', 'FORBIDDEN')
      return
    }

    const { payload } = await executeEntityAction({
      entity,
      action,
      options: body.options || {},
      id: body.id,
      data: body.data,
    })

    const deviceId = String(req.headers['x-device-id'] || '').trim()
    const deviceName = String(req.headers['x-device-name'] || '').trim()

    if (deviceId) {
      await registerDeviceAccess({
        userId: auth.user.id,
        deviceId,
        deviceName,
      })
    }

    sendJson(res, 200, {
      ok: true,
      data: payload,
      session: {
        user: auth.safeUser,
      },
    })
  } catch (error) {
    sendError(res, 500, error.message || 'Erro na operacao da entidade.', 'ENTITY_ERROR')
  }
}
