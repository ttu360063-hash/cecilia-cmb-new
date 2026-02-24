import { randomUUID } from 'crypto'
import { ALL_PERMISSIONS, DEFAULT_ADMIN } from './constants.js'
import { normalizePermissions } from './permissions.js'
import { comparePassword, hashPassword } from './security.js'
import { getSupabaseAdmin } from './supabase.js'

const nowIso = () => new Date().toISOString()

const normalizeUsername = (value) => String(value || '').trim().toLowerCase()

export const sanitizeUser = (user) => {
  if (!user) {
    return null
  }

  return {
    id: user.id,
    name: user.name,
    username: user.username,
    role: user.role,
    permissions: normalizePermissions(user.permissions || []),
    isActive: Boolean(user.is_active),
    createdAt: user.created_at || null,
    updatedAt: user.updated_at || null,
    lastLoginAt: user.last_login_at || null,
  }
}

const resolveUserPermissions = (role, permissions) => {
  const normalizedRole = String(role || '').trim().toLowerCase() || 'operador'
  if (normalizedRole === 'administrador') {
    return [...ALL_PERMISSIONS]
  }
  return normalizePermissions(permissions)
}

export const ensureDefaultAdmin = async () => {
  const supabase = getSupabaseAdmin()

  const { count, error } = await supabase
    .from('users')
    .select('id', { count: 'exact', head: true })

  if (error) {
    throw error
  }

  if ((count || 0) > 0) {
    return
  }

  const passwordHash = await hashPassword(DEFAULT_ADMIN.password)
  const now = nowIso()

  const adminPayload = {
    id: randomUUID(),
    name: DEFAULT_ADMIN.name,
    username: normalizeUsername(DEFAULT_ADMIN.username),
    password_hash: passwordHash,
    role: DEFAULT_ADMIN.role,
    permissions: DEFAULT_ADMIN.permissions,
    is_active: true,
    created_at: now,
    updated_at: now,
    last_login_at: null,
  }

  const { error: insertError } = await supabase.from('users').insert(adminPayload)
  if (insertError) {
    throw insertError
  }
}

export const findUserByUsername = async (username) => {
  const supabase = getSupabaseAdmin()
  const normalizedUsername = normalizeUsername(username)

  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('username', normalizedUsername)
    .maybeSingle()

  if (error) {
    throw error
  }

  return data
}

export const findUserById = async (userId) => {
  const supabase = getSupabaseAdmin()

  const { data, error } = await supabase.from('users').select('*').eq('id', userId).maybeSingle()

  if (error) {
    throw error
  }

  return data
}

export const validateLogin = async ({ username, password }) => {
  await ensureDefaultAdmin()

  const user = await findUserByUsername(username)
  if (!user || !user.password_hash || !user.is_active) {
    return null
  }

  const passwordMatches = await comparePassword(password, user.password_hash)
  if (!passwordMatches) {
    return null
  }

  const supabase = getSupabaseAdmin()
  await supabase
    .from('users')
    .update({
      last_login_at: nowIso(),
      updated_at: nowIso(),
    })
    .eq('id', user.id)

  return await findUserById(user.id)
}

export const listUsers = async () => {
  const supabase = getSupabaseAdmin()

  const { data, error } = await supabase.from('users').select('*').order('created_at', { ascending: true })

  if (error) {
    throw error
  }

  return (data || []).map((user) => sanitizeUser(user))
}

export const createUser = async ({ name, username, password, role, permissions }) => {
  const supabase = getSupabaseAdmin()
  const normalizedUsername = normalizeUsername(username)

  if (!normalizedUsername) {
    throw new Error('Usuario e obrigatorio.')
  }

  if (!password || String(password).length < 6) {
    throw new Error('Senha deve ter no minimo 6 caracteres.')
  }

  const existingUser = await findUserByUsername(normalizedUsername)
  if (existingUser) {
    throw new Error('Ja existe um usuario com esse login.')
  }

  const now = nowIso()
  const passwordHash = await hashPassword(String(password))
  const normalizedRole = String(role || 'operador').trim().toLowerCase() || 'operador'
  const resolvedPermissions = resolveUserPermissions(normalizedRole, permissions)

  const payload = {
    id: randomUUID(),
    name: String(name || '').trim() || normalizedUsername,
    username: normalizedUsername,
    password_hash: passwordHash,
    role: normalizedRole,
    permissions: resolvedPermissions,
    is_active: true,
    created_at: now,
    updated_at: now,
    last_login_at: null,
  }

  const { data, error } = await supabase.from('users').insert(payload).select('*').single()
  if (error) {
    throw error
  }

  return sanitizeUser(data)
}

export const updateUser = async (userId, updates) => {
  const supabase = getSupabaseAdmin()
  const currentUser = await findUserById(userId)

  if (!currentUser) {
    throw new Error('Usuario nao encontrado.')
  }

  const patch = {
    updated_at: nowIso(),
  }

  if (updates.name !== undefined) {
    patch.name = String(updates.name || '').trim() || currentUser.name
  }

  if (updates.username !== undefined) {
    const normalizedUsername = normalizeUsername(updates.username)
    if (!normalizedUsername) {
      throw new Error('Usuario invalido.')
    }

    const existingUser = await findUserByUsername(normalizedUsername)
    if (existingUser && existingUser.id !== userId) {
      throw new Error('Ja existe outro usuario com esse login.')
    }

    patch.username = normalizedUsername
  }

  if (updates.password !== undefined) {
    const passwordText = String(updates.password || '')
    if (passwordText.length < 6) {
      throw new Error('Senha deve ter no minimo 6 caracteres.')
    }
    patch.password_hash = await hashPassword(passwordText)
  }

  if (updates.isActive !== undefined) {
    patch.is_active = Boolean(updates.isActive)
  }

  const nextRole = updates.role !== undefined ? String(updates.role || '').trim().toLowerCase() : currentUser.role
  if (updates.role !== undefined) {
    patch.role = nextRole || currentUser.role
  }

  if (updates.permissions !== undefined || updates.role !== undefined) {
    patch.permissions = resolveUserPermissions(nextRole, updates.permissions ?? currentUser.permissions)
  }

  const { data, error } = await supabase
    .from('users')
    .update(patch)
    .eq('id', userId)
    .select('*')
    .single()

  if (error) {
    throw error
  }

  return sanitizeUser(data)
}

export const deleteUser = async (userId, actingUserId) => {
  const supabase = getSupabaseAdmin()

  if (userId === actingUserId) {
    throw new Error('Voce nao pode excluir seu proprio usuario.')
  }

  const { error: devicesError } = await supabase
    .from('devices')
    .update({
      user_id: null,
      status: 'inativo',
      updated_at: nowIso(),
    })
    .eq('user_id', userId)

  if (devicesError) {
    throw devicesError
  }

  const { error } = await supabase.from('users').delete().eq('id', userId)
  if (error) {
    throw error
  }

  return { success: true }
}
