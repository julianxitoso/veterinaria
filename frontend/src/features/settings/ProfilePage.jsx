import { useMutation } from '@tanstack/react-query'
import { useState } from 'react'
import Button from '../../components/ui/Button'
import { Field, Input } from '../../components/ui/Form'
import { Card, PageHeader } from '../../components/ui/Layout'
import { updatePassword, updateProfile } from '../../services/adminService'
import { useAuthStore } from '../../store/authStore'

/**
 * Datos propios y cambio de contraseña (cualquier usuario).
 */
export default function ProfilePage() {
  const { user, setUser } = useAuthStore()

  return (
    <div className="max-w-2xl space-y-5">
      <PageHeader title="Mi perfil" subtitle={<span className="capitalize">{user?.roles?.join(', ')}</span>} />
      <ProfileForm user={user} onSaved={setUser} />
      <PasswordForm />
    </div>
  )
}

function ProfileForm({ user, onSaved }) {
  const [values, setValues] = useState({ name: user?.name ?? '', email: user?.email ?? '' })
  const mutation = useMutation({ mutationFn: () => updateProfile(values), onSuccess: onSaved })
  const errors = mutation.error?.response?.data?.errors ?? {}
  const set = (f) => (e) => setValues((v) => ({ ...v, [f]: e.target.value }))

  return (
    <Card title="Mis datos">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Nombre" error={errors.name?.[0]}><Input value={values.name} onChange={set('name')} /></Field>
        <Field label="Email (usuario de ingreso)" error={errors.email?.[0]}><Input type="email" value={values.email} onChange={set('email')} /></Field>
      </div>
      <div className="mt-4 flex items-center justify-end gap-3">
        {mutation.isSuccess && <span className="text-sm text-emerald-700">Guardado ✓</span>}
        <Button onClick={() => mutation.mutate()} disabled={mutation.isPending}>Guardar</Button>
      </div>
    </Card>
  )
}

function PasswordForm() {
  const empty = { current_password: '', password: '', password_confirmation: '' }
  const [values, setValues] = useState(empty)
  const mutation = useMutation({ mutationFn: () => updatePassword(values), onSuccess: () => setValues(empty) })
  const errors = mutation.error?.response?.data?.errors ?? {}
  const set = (f) => (e) => setValues((v) => ({ ...v, [f]: e.target.value }))

  return (
    <Card title="Cambiar contraseña">
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Contraseña actual" error={errors.current_password?.[0]}>
          <Input type="password" autoComplete="current-password" value={values.current_password} onChange={set('current_password')} />
        </Field>
        <Field label="Nueva contraseña" error={errors.password?.[0]}>
          <Input type="password" autoComplete="new-password" value={values.password} onChange={set('password')} placeholder="Mínimo 8" />
        </Field>
        <Field label="Repetir nueva">
          <Input type="password" autoComplete="new-password" value={values.password_confirmation} onChange={set('password_confirmation')} />
        </Field>
      </div>
      <div className="mt-4 flex items-center justify-end gap-3">
        {mutation.isSuccess && <span className="text-sm text-emerald-700">Contraseña actualizada ✓ (se cerraron tus otras sesiones)</span>}
        <Button onClick={() => mutation.mutate()} disabled={mutation.isPending || !values.current_password || !values.password}>
          Cambiar contraseña
        </Button>
      </div>
    </Card>
  )
}
