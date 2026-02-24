export const PERMISSIONS = [
  'vender',
  'ver_vendas',
  'produtos',
  'clientes',
  'dashboard',
  'relatorios',
  'configuracoes',
  'usuarios',
] as const

export type Permission = (typeof PERMISSIONS)[number]

export type AuthUser = {
  id: string
  name: string
  username: string
  role: string
  permissions: Permission[]
  isActive: boolean
  createdAt: string | null
  updatedAt: string | null
  lastLoginAt: string | null
}

const TOKEN_KEY = 'cecilia_auth_token'
const USER_KEY = 'cecilia_auth_user'
const DEVICE_ID_KEY = 'cecilia_device_id'
const AUTH_USER_UPDATED_EVENT = 'cecilia-auth-user-updated'

const parseJson = <T>(value: string | null, fallback: T): T => {
  if (!value) {
    return fallback
  }

  try {
    return JSON.parse(value) as T
  } catch (_error) {
    return fallback
  }
}

export const getStoredToken = (): string | null => {
  if (typeof window === 'undefined') {
    return null
  }
  return window.localStorage.getItem(TOKEN_KEY)
}

export const setStoredToken = (token: string): void => {
  if (typeof window === 'undefined') {
    return
  }
  window.localStorage.setItem(TOKEN_KEY, token)
}

export const clearStoredToken = (): void => {
  if (typeof window === 'undefined') {
    return
  }
  window.localStorage.removeItem(TOKEN_KEY)
}

export const getStoredUser = (): AuthUser | null => {
  if (typeof window === 'undefined') {
    return null
  }

  return parseJson<AuthUser | null>(window.localStorage.getItem(USER_KEY), null)
}

export const setStoredUser = (user: AuthUser | null): void => {
  if (typeof window === 'undefined') {
    return
  }

  if (!user) {
    window.localStorage.removeItem(USER_KEY)
  } else {
    window.localStorage.setItem(USER_KEY, JSON.stringify(user))
  }

  window.dispatchEvent(new CustomEvent<AuthUser | null>(AUTH_USER_UPDATED_EVENT, { detail: user }))
}

export const clearSessionStorage = (): void => {
  clearStoredToken()
  setStoredUser(null)
}

export const getDeviceId = (): string => {
  if (typeof window === 'undefined') {
    return 'server-render'
  }

  const cached = window.localStorage.getItem(DEVICE_ID_KEY)
  if (cached) {
    return cached
  }

  const generated =
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : `${Date.now()}_${Math.random().toString(36).slice(2, 10)}`

  window.localStorage.setItem(DEVICE_ID_KEY, generated)
  return generated
}

export const getDeviceName = (): string => {
  if (typeof window === 'undefined') {
    return 'Servidor'
  }

  const platform = navigator.platform || 'plataforma-desconhecida'
  const userAgent = navigator.userAgent || 'user-agent-desconhecido'
  return `${platform} - ${userAgent.slice(0, 80)}`
}

type RequestOptions = RequestInit & {
  skipAuth?: boolean
}

const safeApiErrorMessage = (payload: any, fallback: string): string => {
  if (payload?.message && typeof payload.message === 'string') {
    return payload.message
  }
  return fallback
}

export const apiRequest = async <T>(path: string, options: RequestOptions = {}): Promise<T> => {
  const headers = new Headers(options.headers || {})

  if (!headers.has('Content-Type') && options.body !== undefined) {
    headers.set('Content-Type', 'application/json')
  }

  headers.set('x-device-id', getDeviceId())
  headers.set('x-device-name', getDeviceName())

  if (!options.skipAuth) {
    const token = getStoredToken()
    if (token) {
      headers.set('Authorization', `Bearer ${token}`)
    }
  }

  const response = await fetch(path, {
    ...options,
    headers,
  })

  let payload: any = null
  try {
    payload = await response.json()
  } catch (_error) {
    payload = null
  }

  if (!response.ok || payload?.ok === false) {
    if (response.status === 401) {
      clearSessionStorage()
    }

    const message = safeApiErrorMessage(payload, 'Erro ao comunicar com o servidor.')
    const error = new Error(message)
    ;(error as Error & { status?: number; code?: string }).status = response.status
    ;(error as Error & { status?: number; code?: string }).code = payload?.code
    throw error
  }

  if (payload?.session?.user) {
    setStoredUser(payload.session.user as AuthUser)
  }

  return payload as T
}

export const loginWithPassword = async (username: string, password: string) => {
  return apiRequest<{ ok: true; token: string; user: AuthUser }>('/api/auth/login', {
    method: 'POST',
    skipAuth: true,
    body: JSON.stringify({
      username,
      password,
      deviceId: getDeviceId(),
      deviceName: getDeviceName(),
    }),
  })
}

export const fetchCurrentUser = async () => {
  return apiRequest<{ ok: true; user: AuthUser; session: { user: AuthUser } }>('/api/auth/me', {
    method: 'GET',
  })
}

export const onAuthUserUpdated = (listener: (user: AuthUser | null) => void): (() => void) => {
  if (typeof window === 'undefined') {
    return () => undefined
  }

  const eventListener = (event: Event) => {
    const customEvent = event as CustomEvent<AuthUser | null>
    listener(customEvent.detail ?? null)
  }

  window.addEventListener(AUTH_USER_UPDATED_EVENT, eventListener)
  return () => {
    window.removeEventListener(AUTH_USER_UPDATED_EVENT, eventListener)
  }
}

export const isAdminAuthenticated = (): boolean => Boolean(getStoredToken())
export const setAdminAuthenticated = (value: boolean): void => {
  if (!value) {
    clearSessionStorage()
  }
}
