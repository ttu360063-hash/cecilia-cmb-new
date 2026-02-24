import { verifyAuthToken } from './security.js'
import { findUserById, sanitizeUser } from './users.js'
import { hasAnyPermission } from './permissions.js'

export const extractBearerToken = (req) => {
  const authorizationHeader = String(req.headers.authorization || '').trim()
  if (!authorizationHeader.toLowerCase().startsWith('bearer ')) {
    return null
  }
  return authorizationHeader.slice(7).trim()
}

export const authenticateRequest = async (req, requiredPermissions = []) => {
  const token = extractBearerToken(req)

  if (!token) {
    return {
      ok: false,
      status: 401,
      code: 'UNAUTHENTICATED',
      message: 'Sessao nao encontrada. Faca login novamente.',
    }
  }

  let payload
  try {
    payload = await verifyAuthToken(token)
  } catch (_error) {
    return {
      ok: false,
      status: 401,
      code: 'TOKEN_INVALID',
      message: 'Sessao invalida ou expirada.',
    }
  }

  const userId = String(payload?.sub || '').trim()
  if (!userId) {
    return {
      ok: false,
      status: 401,
      code: 'TOKEN_INVALID',
      message: 'Token sem usuario valido.',
    }
  }

  const user = await findUserById(userId)
  if (!user || !user.is_active) {
    return {
      ok: false,
      status: 401,
      code: 'USER_INACTIVE',
      message: 'Usuario inativo ou inexistente.',
    }
  }

  if (!hasAnyPermission(user, requiredPermissions)) {
    return {
      ok: false,
      status: 403,
      code: 'FORBIDDEN',
      message: 'Sem permissao para acessar esse recurso.',
    }
  }

  return {
    ok: true,
    user,
    safeUser: sanitizeUser(user),
  }
}
