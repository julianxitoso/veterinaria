import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { UserPlus } from 'lucide-react'
import { useState } from 'react'
import Button from '../../components/ui/Button'
import { Checkbox, Field, FormError, Input, Select } from '../../components/ui/Form'
import { Card, EmptyState, PageHeader, Spinner } from '../../components/ui/Layout'
import Modal from '../../components/ui/Modal'
import Tabs from '../../components/ui/Tabs'
import { useCan } from '../../hooks/useCan'
import { listRoles, listUsers, saveUser } from '../../services/adminService'
import { useAuthStore } from '../../store/authStore'
import { formatDateTime } from '../../utils/format'
import { ADMIN_TABS } from './adminLabels'

export default function UsersPage() {
  const queryClient = useQueryClient()
  const currentUser = useAuthStore((s) => s.user)
  const canCreate = useCan('usuarios.crear')
  const canEdit = useCan('usuarios.editar')
  const [editing, setEditing] = useState(null)

  const { data: users, isPending } = useQuery({ queryKey: ['users'], queryFn: listUsers })
  const { data: roles } = useQuery({ queryKey: ['roles'], queryFn: listRoles })

  return (
    <div className="max-w-4xl">
      <PageHeader
        title="Usuarios"
        subtitle="Quién accede al sistema y con qué rol"
        actions={canCreate && <Button icon={UserPlus} onClick={() => setEditing({})}>Nuevo usuario</Button>}
      />
      <Tabs tabs={ADMIN_TABS} />

      <Card flush>
        {isPending ? (
          <Spinner />
        ) : users.length === 0 ? (
          <EmptyState>No hay usuarios.</EmptyState>
        ) : (
          <ul className="divide-y divide-line">
            {users.map((u) => (
              <li key={u.id} className={`flex flex-wrap items-center justify-between gap-3 px-5 py-3 ${u.is_active ? '' : 'opacity-50'}`}>
                <div className="flex min-w-0 items-center gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-light font-semibold text-brand-dark">
                    {u.name.charAt(0).toUpperCase()}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate font-medium">
                      {u.name}
                      {u.id === currentUser?.id && <span className="ml-2 text-xs font-normal text-muted">(tú)</span>}
                      {!u.is_active && <span className="ml-2 rounded-full bg-stone-200 px-2 py-0.5 text-xs font-normal">Inactivo</span>}
                    </p>
                    <p className="truncate text-sm text-muted">{u.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <span className="rounded-full bg-stone-100 px-2 py-0.5 text-xs font-medium capitalize text-stone-700">{u.roles.join(', ')}</span>
                    <p className="mt-1 text-xs text-stone-400">
                      {u.last_login_at ? `Último ingreso: ${formatDateTime(u.last_login_at)}` : 'Nunca ha ingresado'}
                    </p>
                  </div>
                  {canEdit && (
                    <button type="button" className="text-sm text-brand-dark hover:underline" onClick={() => setEditing(u)}>
                      Editar
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {editing && (
        <UserFormModal
          user={editing}
          roles={roles?.data ?? []}
          isSelf={editing.id === currentUser?.id}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null)
            queryClient.invalidateQueries({ queryKey: ['users'] })
            queryClient.invalidateQueries({ queryKey: ['roles'] })
          }}
        />
      )}
    </div>
  )
}

function UserFormModal({ user, roles, isSelf, onClose, onSaved }) {
  const isEdit = Boolean(user.id)
  const [values, setValues] = useState({
    id: user.id,
    name: user.name ?? '',
    email: user.email ?? '',
    role: user.roles?.[0] ?? 'veterinario',
    password: '',
    is_active: user.is_active ?? true,
  })
  const [resetPassword, setResetPassword] = useState(!isEdit)
  const set = (field) => (e) => setValues((v) => ({ ...v, [field]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }))

  const mutation = useMutation({
    mutationFn: () => saveUser({ ...values, password: resetPassword ? values.password : null }),
    onSuccess: onSaved,
  })

  const errors = mutation.error?.response?.data?.errors ?? {}
  const generalError = mutation.error && !mutation.error.response?.data?.errors ? 'No se pudo guardar.' : null

  return (
    <Modal title={isEdit ? `Editar a ${user.name}` : 'Nuevo usuario'} onClose={onClose}>
      <div className="space-y-4">
        <Field label="Nombre completo" required error={errors.name?.[0]}>
          <Input value={values.name} onChange={set('name')} autoFocus />
        </Field>
        <Field label="Email (usuario de ingreso)" required error={errors.email?.[0]}>
          <Input type="email" value={values.email} onChange={set('email')} />
        </Field>
        <Field label="Rol" required error={errors.role?.[0]}>
          <Select value={values.role} onChange={set('role')} disabled={isSelf} className="capitalize">
            {roles.map((r) => <option key={r.id} value={r.name}>{r.name}</option>)}
          </Select>
          {isSelf && <span className="mt-1 block text-xs text-muted">No puedes cambiar tu propio rol.</span>}
        </Field>

        {isEdit && (
          <Checkbox label="Restablecer contraseña" checked={resetPassword} onChange={(e) => setResetPassword(e.target.checked)} />
        )}
        {resetPassword && (
          <Field label={isEdit ? 'Nueva contraseña' : 'Contraseña inicial'} required error={errors.password?.[0]}>
            <Input type="text" value={values.password} onChange={set('password')} placeholder="Mínimo 8 caracteres" autoComplete="new-password" />
            <span className="mt-1 block text-xs text-muted">Compártela con la persona; podrá cambiarla en "Mi perfil".</span>
          </Field>
        )}

        {isEdit && !isSelf && (
          <Checkbox label="Usuario activo (desmarcar bloquea su acceso y cierra sus sesiones)" checked={values.is_active} onChange={set('is_active')} />
        )}

        <FormError message={generalError} />
      </div>

      <div className="mt-5 flex justify-end gap-2">
        <Button variant="secondary" onClick={onClose}>Cancelar</Button>
        <Button onClick={() => mutation.mutate()} disabled={mutation.isPending}>{mutation.isPending ? 'Guardando…' : 'Guardar'}</Button>
      </div>
    </Modal>
  )
}
