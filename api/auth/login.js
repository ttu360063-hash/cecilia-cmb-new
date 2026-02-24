import { registerDeviceAccess } from '../_lib/devices.js'
import { sendError, sendJson, readJsonBody } from '../_lib/http.js'
import { signAuthToken } from '../_lib/security.js'
import { sanitizeUser, validateLogin } from '../_lib/users.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    sendError(res, 405, 'Metodo nao permitido.', 'METHOD_NOT_ALLOWED')
    return
  }

  try {
    const body = await readJsonBody(req)
    const username = String(body.username || '').trim()
    const password = String(body.password || '')
    const deviceId = String(body.deviceId || '').trim()
    const deviceName = String(body.deviceName || '').trim()

    if (!username || !password) {
      sendError(res, 400, 'Usuario e senha sao obrigatorios.', 'INVALID_CREDENTIALS')
      return
    }

    const user = await validateLogin({ username, password })
    if (!user) {
      sendError(res, 401, 'Usuario ou senha invalidos.', 'INVALID_CREDENTIALS')
      return
    }

    if (deviceId) {
      await registerDeviceAccess({
        userId: user.id,
        deviceId,
        deviceName,
      })
    }

    const token = await signAuthToken({ userId: user.id })

    sendJson(res, 200, {
      ok: true,
      token,
      user: sanitizeUser(user),
    })
  } catch (error) {
    sendError(res, 500, error.message || 'Erro ao realizar login.', 'LOGIN_ERROR')
  }
}
