import { authenticateRequest } from '../_lib/auth.js'
import { registerDeviceAccess } from '../_lib/devices.js'
import { sendError, sendJson } from '../_lib/http.js'

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    sendError(res, 405, 'Metodo nao permitido.', 'METHOD_NOT_ALLOWED')
    return
  }

  try {
    const auth = await authenticateRequest(req)

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

    sendJson(res, 200, {
      ok: true,
      user: auth.safeUser,
      session: {
        user: auth.safeUser,
      },
    })
  } catch (error) {
    sendError(res, 500, error.message || 'Erro ao validar sessao.', 'SESSION_ERROR')
  }
}
