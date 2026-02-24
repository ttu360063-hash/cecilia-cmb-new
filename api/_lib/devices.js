import { getSupabaseAdmin } from './supabase.js'

const nowIso = () => new Date().toISOString()

export const registerDeviceAccess = async ({ userId, deviceId, deviceName }) => {
  if (!deviceId) {
    return null
  }

  const supabase = getSupabaseAdmin()

  const { data: existing, error: fetchError } = await supabase
    .from('devices')
    .select('*')
    .eq('device_id', deviceId)
    .maybeSingle()

  if (fetchError) {
    throw fetchError
  }

  const now = nowIso()
  const normalizedDeviceName = String(deviceName || 'Dispositivo nao identificado').trim()

  if (!existing) {
    const payload = {
      device_id: deviceId,
      user_id: userId,
      device_name: normalizedDeviceName,
      first_access_at: now,
      last_access_at: now,
      status: 'ativo',
      created_at: now,
      updated_at: now,
    }

    const { data, error } = await supabase.from('devices').insert(payload).select('*').single()
    if (error) {
      throw error
    }

    return data
  }

  const patch = {
    user_id: userId,
    device_name: normalizedDeviceName || existing.device_name,
    last_access_at: now,
    status: 'ativo',
    updated_at: now,
  }

  const { data, error } = await supabase
    .from('devices')
    .update(patch)
    .eq('device_id', deviceId)
    .select('*')
    .single()

  if (error) {
    throw error
  }

  return data
}

export const listDevices = async () => {
  const supabase = getSupabaseAdmin()

  const { data: devices, error } = await supabase
    .from('devices')
    .select('*')
    .order('last_access_at', { ascending: false })

  if (error) {
    throw error
  }

  const { data: users, error: usersError } = await supabase.from('users').select('id,name,username')
  if (usersError) {
    throw usersError
  }

  const usersMap = new Map((users || []).map((user) => [user.id, user]))

  return (devices || []).map((device) => ({
    id: device.id,
    deviceId: device.device_id,
    userId: device.user_id,
    user: device.user_id ? usersMap.get(device.user_id) || null : null,
    deviceName: device.device_name,
    firstAccessAt: device.first_access_at,
    lastAccessAt: device.last_access_at,
    status: device.status,
    createdAt: device.created_at,
    updatedAt: device.updated_at,
  }))
}

export const unlinkDevice = async (deviceId) => {
  const supabase = getSupabaseAdmin()

  const { data, error } = await supabase
    .from('devices')
    .update({
      user_id: null,
      status: 'inativo',
      updated_at: nowIso(),
    })
    .eq('device_id', deviceId)
    .select('*')
    .maybeSingle()

  if (error) {
    throw error
  }

  return data
}

export const transferDevice = async ({ deviceId, targetUserId }) => {
  const supabase = getSupabaseAdmin()

  const { data: user, error: userError } = await supabase
    .from('users')
    .select('id')
    .eq('id', targetUserId)
    .maybeSingle()

  if (userError) {
    throw userError
  }

  if (!user) {
    throw new Error('Usuario de destino nao encontrado.')
  }

  const { data, error } = await supabase
    .from('devices')
    .update({
      user_id: targetUserId,
      status: 'ativo',
      updated_at: nowIso(),
    })
    .eq('device_id', deviceId)
    .select('*')
    .maybeSingle()

  if (error) {
    throw error
  }

  return data
}
