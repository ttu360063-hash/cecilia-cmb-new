import React, { useEffect, useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import { apiRequest, PERMISSIONS, type AuthUser, type Permission } from '../lib/auth'

type ManagedUser = AuthUser

type DeviceRecord = {
  id: string
  deviceId: string
  userId: string | null
  user: { id: string; name: string; username: string } | null
  deviceName: string
  firstAccessAt: string | null
  lastAccessAt: string | null
  status: 'ativo' | 'inativo'
}

type UserFormState = {
  name: string
  username: string
  password: string
  role: string
  permissions: Permission[]
}

const emptyUserForm: UserFormState = {
  name: '',
  username: '',
  password: '',
  role: 'operador',
  permissions: ['vender'],
}

const formatDate = (value: string | null | undefined) => {
  if (!value) return '-'
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return '-'
  return parsed.toLocaleString('pt-BR')
}

const UsersManagement: React.FC = () => {
  const [users, setUsers] = useState<ManagedUser[]>([])
  const [devices, setDevices] = useState<DeviceRecord[]>([])
  const [loadingUsers, setLoadingUsers] = useState(true)
  const [loadingDevices, setLoadingDevices] = useState(true)

  const [creating, setCreating] = useState(false)
  const [createForm, setCreateForm] = useState<UserFormState>(emptyUserForm)

  const [editingUser, setEditingUser] = useState<ManagedUser | null>(null)
  const [editingForm, setEditingForm] = useState<UserFormState>(emptyUserForm)

  const [transferTargetByDevice, setTransferTargetByDevice] = useState<Record<string, string>>({})

  const userOptions = useMemo(() => users.map((user) => ({ id: user.id, label: `${user.name} (${user.username})` })), [users])

  const loadUsers = async () => {
    setLoadingUsers(true)
    try {
      const response = await apiRequest<{ ok: true; data: ManagedUser[] }>('/api/users', {
        method: 'POST',
        body: JSON.stringify({ action: 'listUsers' }),
      })
      setUsers(response.data || [])
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro ao carregar usu?rios.')
    } finally {
      setLoadingUsers(false)
    }
  }

  const loadDevices = async () => {
    setLoadingDevices(true)
    try {
      const response = await apiRequest<{ ok: true; data: DeviceRecord[] }>('/api/users', {
        method: 'POST',
        body: JSON.stringify({ action: 'listDevices' }),
      })
      setDevices(response.data || [])
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro ao carregar dispositivos.')
    } finally {
      setLoadingDevices(false)
    }
  }

  useEffect(() => {
    loadUsers().catch(() => undefined)
    loadDevices().catch(() => undefined)
  }, [])

  const togglePermission = (form: UserFormState, permission: Permission): UserFormState => {
    const exists = form.permissions.includes(permission)
    if (exists) {
      const updated = form.permissions.filter((item) => item !== permission)
      return { ...form, permissions: updated }
    }
    return { ...form, permissions: [...form.permissions, permission] }
  }

  const handleCreateUser = async (event: React.FormEvent) => {
    event.preventDefault()
    setCreating(true)

    try {
      await apiRequest('/api/users', {
        method: 'POST',
        body: JSON.stringify({
          action: 'createUser',
          payload: createForm,
        }),
      })

      toast.success('Usu?rio criado com sucesso.')
      setCreateForm(emptyUserForm)
      await loadUsers()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro ao criar usu?rio.')
    } finally {
      setCreating(false)
    }
  }

  const openEdit = (user: ManagedUser) => {
    setEditingUser(user)
    setEditingForm({
      name: user.name,
      username: user.username,
      password: '',
      role: user.role,
      permissions: user.permissions,
    })
  }

  const handleSaveEdit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!editingUser) {
      return
    }

    try {
      await apiRequest('/api/users', {
        method: 'POST',
        body: JSON.stringify({
          action: 'updateUser',
          userId: editingUser.id,
          payload: {
            ...editingForm,
            password: editingForm.password || undefined,
          },
        }),
      })

      toast.success('Usu?rio atualizado com sucesso.')
      setEditingUser(null)
      setEditingForm(emptyUserForm)
      await loadUsers()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro ao atualizar usu?rio.')
    }
  }

  const handleToggleActive = async (user: ManagedUser) => {
    try {
      await apiRequest('/api/users', {
        method: 'POST',
        body: JSON.stringify({
          action: 'updateUser',
          userId: user.id,
          payload: {
            isActive: !user.isActive,
          },
        }),
      })

      toast.success(user.isActive ? 'Usu?rio desativado.' : 'Usu?rio ativado.')
      await loadUsers()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro ao alterar status do usu?rio.')
    }
  }

  const handleDeleteUser = async (user: ManagedUser) => {
    const confirmed = window.confirm(`Excluir o usu?rio ${user.username}?`)
    if (!confirmed) {
      return
    }

    try {
      await apiRequest('/api/users', {
        method: 'POST',
        body: JSON.stringify({
          action: 'deleteUser',
          userId: user.id,
        }),
      })

      toast.success('Usu?rio exclu?do com sucesso.')
      await loadUsers()
      await loadDevices()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro ao excluir usu?rio.')
    }
  }

  const handleUnlinkDevice = async (deviceId: string) => {
    try {
      await apiRequest('/api/users', {
        method: 'POST',
        body: JSON.stringify({
          action: 'unlinkDevice',
          deviceId,
        }),
      })

      toast.success('Dispositivo desvinculado.')
      await loadDevices()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro ao desvincular dispositivo.')
    }
  }

  const handleTransferDevice = async (deviceId: string) => {
    const targetUserId = transferTargetByDevice[deviceId]
    if (!targetUserId) {
      toast.error('Selecione o usu?rio de destino.')
      return
    }

    try {
      await apiRequest('/api/users', {
        method: 'POST',
        body: JSON.stringify({
          action: 'transferDevice',
          deviceId,
          targetUserId,
        }),
      })

      toast.success('Dispositivo transferido com sucesso.')
      await loadDevices()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro ao transferir dispositivo.')
    }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl bg-[#12081e]/95 p-6 shadow-[0_0_50px_rgba(219,39,119,0.18)]">
        <h1 className="text-2xl font-bold text-white">Usu?rios e Permiss?es</h1>
        <p className="mt-2 text-sm text-fuchsia-200/85">
          Gerencie login, permiss?es individuais e controle de dispositivos vinculados.
        </p>
      </div>

      <div className="rounded-2xl bg-[#12081e]/95 p-6 shadow-[0_0_50px_rgba(219,39,119,0.18)]">
        <h2 className="mb-4 text-lg font-semibold text-fuchsia-100">Novo usu?rio</h2>
        <form onSubmit={handleCreateUser} className="grid gap-4 lg:grid-cols-2">
          <input
            value={createForm.name}
            onChange={(event) => setCreateForm((current) => ({ ...current, name: event.target.value }))}
            placeholder="Nome"
            className="rounded-lg border border-fuchsia-500/35 bg-[#140a21] px-3 py-2 text-fuchsia-50"
            required
          />
          <input
            value={createForm.username}
            onChange={(event) => setCreateForm((current) => ({ ...current, username: event.target.value }))}
            placeholder="Usu?rio"
            className="rounded-lg border border-fuchsia-500/35 bg-[#140a21] px-3 py-2 text-fuchsia-50"
            required
          />
          <input
            type="password"
            value={createForm.password}
            onChange={(event) => setCreateForm((current) => ({ ...current, password: event.target.value }))}
            placeholder="Senha"
            className="rounded-lg border border-fuchsia-500/35 bg-[#140a21] px-3 py-2 text-fuchsia-50"
            required
          />
          <select
            value={createForm.role}
            onChange={(event) => setCreateForm((current) => ({ ...current, role: event.target.value }))}
            className="rounded-lg border border-fuchsia-500/35 bg-[#140a21] px-3 py-2 text-fuchsia-50"
          >
            <option value="operador">Operador</option>
            <option value="administrador">Administrador</option>
          </select>

          <div className="lg:col-span-2">
            <p className="mb-2 text-sm font-semibold text-fuchsia-100">Permiss?es</p>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              {PERMISSIONS.map((permission) => (
                <label key={permission} className="flex items-center gap-2 rounded-lg border border-fuchsia-500/25 bg-[#10071a] px-3 py-2 text-sm text-fuchsia-100">
                  <input
                    type="checkbox"
                    checked={createForm.permissions.includes(permission)}
                    onChange={() => setCreateForm((current) => togglePermission(current, permission))}
                  />
                  <span>{permission}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="lg:col-span-2">
            <button
              type="submit"
              disabled={creating}
              className="rounded-lg bg-fuchsia-600 px-4 py-2 font-semibold text-white transition hover:bg-fuchsia-500 disabled:opacity-60"
            >
              {creating ? 'Salvando...' : 'Criar usu?rio'}
            </button>
          </div>
        </form>
      </div>

      <div className="rounded-2xl bg-[#12081e]/95 p-6 shadow-[0_0_50px_rgba(219,39,119,0.18)]">
        <h2 className="mb-4 text-lg font-semibold text-fuchsia-100">Usu?rios cadastrados</h2>
        {loadingUsers ? (
          <p className="text-fuchsia-200/80">Carregando usu?rios...</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm text-fuchsia-100">
              <thead>
                <tr className="border-b border-fuchsia-900/40 text-left text-fuchsia-200/90">
                  <th className="px-3 py-2">Usu?rio</th>
                  <th className="px-3 py-2">Perfil</th>
                  <th className="px-3 py-2">Permiss?es</th>
                  <th className="px-3 py-2">?ltimo login</th>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2">A??es</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id} className="border-b border-fuchsia-900/20">
                    <td className="px-3 py-2">
                      <p className="font-semibold">{user.name}</p>
                      <p className="text-xs text-fuchsia-300">{user.username}</p>
                    </td>
                    <td className="px-3 py-2 capitalize">{user.role}</td>
                    <td className="px-3 py-2">{user.permissions.join(', ') || '-'}</td>
                    <td className="px-3 py-2">{formatDate(user.lastLoginAt)}</td>
                    <td className="px-3 py-2">{user.isActive ? 'Ativo' : 'Inativo'}</td>
                    <td className="px-3 py-2">
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => openEdit(user)}
                          className="rounded-md border border-fuchsia-500/35 px-2 py-1 text-xs hover:bg-fuchsia-900/30"
                        >
                          Editar
                        </button>
                        <button
                          type="button"
                          onClick={() => handleToggleActive(user)}
                          className="rounded-md border border-fuchsia-500/35 px-2 py-1 text-xs hover:bg-fuchsia-900/30"
                        >
                          {user.isActive ? 'Desativar' : 'Ativar'}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteUser(user)}
                          className="rounded-md border border-rose-400/40 px-2 py-1 text-xs text-rose-200 hover:bg-rose-900/25"
                        >
                          Excluir
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {editingUser && (
        <div className="rounded-2xl bg-[#12081e]/95 p-6 shadow-[0_0_50px_rgba(219,39,119,0.18)]">
          <h2 className="mb-4 text-lg font-semibold text-fuchsia-100">Editar usu?rio: {editingUser.username}</h2>
          <form onSubmit={handleSaveEdit} className="grid gap-4 lg:grid-cols-2">
            <input
              value={editingForm.name}
              onChange={(event) => setEditingForm((current) => ({ ...current, name: event.target.value }))}
              placeholder="Nome"
              className="rounded-lg border border-fuchsia-500/35 bg-[#140a21] px-3 py-2 text-fuchsia-50"
              required
            />
            <input
              value={editingForm.username}
              onChange={(event) => setEditingForm((current) => ({ ...current, username: event.target.value }))}
              placeholder="Usu?rio"
              className="rounded-lg border border-fuchsia-500/35 bg-[#140a21] px-3 py-2 text-fuchsia-50"
              required
            />
            <input
              type="password"
              value={editingForm.password}
              onChange={(event) => setEditingForm((current) => ({ ...current, password: event.target.value }))}
              placeholder="Nova senha (opcional)"
              className="rounded-lg border border-fuchsia-500/35 bg-[#140a21] px-3 py-2 text-fuchsia-50"
            />
            <select
              value={editingForm.role}
              onChange={(event) => setEditingForm((current) => ({ ...current, role: event.target.value }))}
              className="rounded-lg border border-fuchsia-500/35 bg-[#140a21] px-3 py-2 text-fuchsia-50"
            >
              <option value="operador">Operador</option>
              <option value="administrador">Administrador</option>
            </select>

            <div className="lg:col-span-2">
              <p className="mb-2 text-sm font-semibold text-fuchsia-100">Permiss?es</p>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                {PERMISSIONS.map((permission) => (
                  <label key={permission} className="flex items-center gap-2 rounded-lg border border-fuchsia-500/25 bg-[#10071a] px-3 py-2 text-sm text-fuchsia-100">
                    <input
                      type="checkbox"
                      checked={editingForm.permissions.includes(permission)}
                      onChange={() => setEditingForm((current) => togglePermission(current, permission))}
                    />
                    <span>{permission}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="lg:col-span-2 flex gap-2">
              <button type="submit" className="rounded-lg bg-fuchsia-600 px-4 py-2 font-semibold text-white transition hover:bg-fuchsia-500">
                Salvar altera??es
              </button>
              <button
                type="button"
                onClick={() => setEditingUser(null)}
                className="rounded-lg border border-fuchsia-500/35 px-4 py-2 font-semibold text-fuchsia-100 hover:bg-fuchsia-900/25"
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="rounded-2xl bg-[#12081e]/95 p-6 shadow-[0_0_50px_rgba(219,39,119,0.18)]">
        <h2 className="mb-4 text-lg font-semibold text-fuchsia-100">Dispositivos</h2>
        {loadingDevices ? (
          <p className="text-fuchsia-200/80">Carregando dispositivos...</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm text-fuchsia-100">
              <thead>
                <tr className="border-b border-fuchsia-900/40 text-left text-fuchsia-200/90">
                  <th className="px-3 py-2">Dispositivo</th>
                  <th className="px-3 py-2">Usu?rio vinculado</th>
                  <th className="px-3 py-2">Primeiro acesso</th>
                  <th className="px-3 py-2">?ltimo acesso</th>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2">A??es</th>
                </tr>
              </thead>
              <tbody>
                {devices.map((device) => (
                  <tr key={device.deviceId} className="border-b border-fuchsia-900/20">
                    <td className="px-3 py-2">
                      <p className="font-semibold">{device.deviceName}</p>
                      <p className="text-xs text-fuchsia-300">{device.deviceId}</p>
                    </td>
                    <td className="px-3 py-2">{device.user ? `${device.user.name} (${device.user.username})` : '-'}</td>
                    <td className="px-3 py-2">{formatDate(device.firstAccessAt)}</td>
                    <td className="px-3 py-2">{formatDate(device.lastAccessAt)}</td>
                    <td className="px-3 py-2">{device.status}</td>
                    <td className="px-3 py-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleUnlinkDevice(device.deviceId)}
                          className="rounded-md border border-fuchsia-500/35 px-2 py-1 text-xs hover:bg-fuchsia-900/30"
                        >
                          Desvincular
                        </button>

                        <select
                          value={transferTargetByDevice[device.deviceId] || ''}
                          onChange={(event) =>
                            setTransferTargetByDevice((current) => ({
                              ...current,
                              [device.deviceId]: event.target.value,
                            }))
                          }
                          className="rounded-md border border-fuchsia-500/35 bg-[#140a21] px-2 py-1 text-xs text-fuchsia-100"
                        >
                          <option value="">Transferir para...</option>
                          {userOptions.map((option) => (
                            <option key={option.id} value={option.id}>
                              {option.label}
                            </option>
                          ))}
                        </select>

                        <button
                          type="button"
                          onClick={() => handleTransferDevice(device.deviceId)}
                          className="rounded-md border border-fuchsia-500/35 px-2 py-1 text-xs hover:bg-fuchsia-900/30"
                        >
                          Transferir
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

export default UsersManagement
