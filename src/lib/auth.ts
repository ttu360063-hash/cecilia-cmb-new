const ADMIN_SESSION_KEY = 'cecilia_admin_auth'

export const isAdminAuthenticated = (): boolean => {
  if (typeof window === 'undefined') {
    return false
  }
  return window.localStorage.getItem(ADMIN_SESSION_KEY) === '1'
}

export const setAdminAuthenticated = (value: boolean): void => {
  if (typeof window === 'undefined') {
    return
  }
  if (value) {
    window.localStorage.setItem(ADMIN_SESSION_KEY, '1')
    return
  }
  window.localStorage.removeItem(ADMIN_SESSION_KEY)
}
