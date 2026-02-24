import { authenticateRequest } from './_lib/auth.js'
import { listDevices, transferDevice, unlinkDevice } from './_lib/devices.js'
import { sendError, sendJson, readJsonBody } from './_lib/http.js'
import { createUser, deleteUser, listUsers, updateUser } from './_lib/users.js'

const validActions = [
  'listUsers',
  'createUser',
  'updateUser',
  'deleteUser',
  'listDevices',
  'unlinkDevice',
  'transferDevice',
]

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    sendError(res, 405, 'Metodo nao permitido.', 'METHOD_NOT_ALLOWED')
    return
  }

  try {
    const auth = await authenticateRequest(req, ['usuarios'])

    if (!auth.ok) {
      sendError(res, auth.status, auth.message, auth.code)
      return
    }

    const body = await readJsonBody(req)
    const action = String(body.action || '').trim()

    if (!validActions.includes(action)) {
      sendError(res, 400, 'Acao invalida.', 'INVALID_ACTION')
      return
    }

    if (action === 'listUsers') {
      const users = await listUsers()
      sendJson(res, 200, {
        ok: true,
        data: users,
        session: { user: auth.safeUser },
      })
      return
    }

    if (action === 'createUser') {
      const user = await createUser(body.payload || {})
      sendJson(res, 200, {
        ok: true,
        data: user,
        session: { user: auth.safeUser },
      })
      return
    }

    if (action === 'updateUser') {
      const userId = String(body.userId || '').trim()
      if (!userId) {
        sendError(res, 400, 'userId e obrigatorio.', 'INVALID_INPUT')
        return
      }

      const user = await updateUser(userId, body.payload || {})
      sendJson(res, 200, {
        ok: true,
        data: user,
        session: { user: auth.safeUser },
      })
      return
    }

    if (action === 'deleteUser') {
      const userId = String(body.userId || '').trim()
      if (!userId) {
        sendError(res, 400, 'userId e obrigatorio.', 'INVALID_INPUT')
        return
      }

      const result = await deleteUser(userId, auth.user.id)
      sendJson(res, 200, {
        ok: true,
        data: result,
        session: { user: auth.safeUser },
      })
      return
    }

    if (action === 'listDevices') {
      const devices = await listDevices()
      sendJson(res, 200, {
        ok: true,
        data: devices,
        session: { user: auth.safeUser },
      })
      return
    }

    if (action === 'unlinkDevice') {
      const deviceId = String(body.deviceId || '').trim()
      if (!deviceId) {
        sendError(res, 400, 'deviceId e obrigatorio.', 'INVALID_INPUT')
        return
      }

      const result = await unlinkDevice(deviceId)
      sendJson(res, 200, {
        ok: true,
        data: result,
        session: { user: auth.safeUser },
      })
      return
    }

    if (action === 'transferDevice') {
      const deviceId = String(body.deviceId || '').trim()
      const targetUserId = String(body.targetUserId || '').trim()

      if (!deviceId || !targetUserId) {
        sendError(res, 400, 'deviceId e targetUserId sao obrigatorios.', 'INVALID_INPUT')
        return
      }

      const result = await transferDevice({ deviceId, targetUserId })
      sendJson(res, 200, {
        ok: true,
        data: result,
        session: { user: auth.safeUser },
      })
      return
    }
  } catch (error) {
    sendError(res, 500, error.message || 'Erro no gerenciamento de usuarios.', 'USERS_ERROR')
  }
}
