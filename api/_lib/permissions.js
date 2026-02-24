import { ALL_PERMISSIONS, ENTITY_PERMISSION_RULES } from './constants.js'

export const normalizePermissions = (permissions) => {
  if (!Array.isArray(permissions)) {
    return []
  }

  const filtered = permissions.filter((permission) => ALL_PERMISSIONS.includes(permission))
  return [...new Set(filtered)]
}

export const isAdminUser = (user) => {
  return String(user?.role || '').toLowerCase() === 'administrador'
}

export const hasPermission = (user, permission) => {
  if (isAdminUser(user)) {
    return true
  }

  const userPermissions = normalizePermissions(user?.permissions || [])
  return userPermissions.includes(permission)
}

export const hasAnyPermission = (user, permissions) => {
  if (!Array.isArray(permissions) || permissions.length === 0) {
    return true
  }

  return permissions.some((permission) => hasPermission(user, permission))
}

export const requiredEntityPermissions = (entity, action) => {
  const entityRules = ENTITY_PERMISSION_RULES[entity] || {}
  return entityRules[action] || []
}
