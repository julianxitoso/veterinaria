import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Lock, Plus, Users } from 'lucide-react'
import { useState } from 'react'
import Button from '../../components/ui/Button'
import { Field, FormError, Input } from '../../components/ui/Form'
import { Card, PageHeader, Spinner } from '../../components/ui/Layout'
import Modal from '../../components/ui/Modal'
import Tabs from '../../components/ui/Tabs'
import { useCan } from '../../hooks/useCan'
import { listRoles, saveRole } from '../../services/adminService'
import { ACTION_LABELS, ADMIN_TABS, MODULE_LABELS } from './adminLabels'

/**
 * Matriz de permisos por rol: módulos en filas, acciones como casillas.
 */
export default function RolesPage() {
  const queryClient = useQueryClient()
  const canEdit = useCan('usuarios.editar')
  const [selectedId, setSelectedId] = useState(null)
  const [creating, setCreating] = useState(false)

  const { data, isPending } = useQuery({ queryKey: ['roles'], queryFn: listRoles })

  if (isPending) return <Spinner />

  const roles = data.data
  const selected = roles.find((r) => r.id === selectedId) ?? roles[0]

  return (
    <div className="max-w-4xl">
      <PageHeader
        title="Roles y permisos"
        subtitle="Qué puede hacer cada rol dentro del sistema"
        actions={canEdit && <Button icon={Plus} onClick={() => setCreating(true)}>Nuevo rol</Button>}
      />
      <Tabs tabs={ADMIN_TABS} />

      <div className="grid gap-5 md:grid-cols-[14rem_1fr]">
        <Card flush>
          <ul className="py-1">
            {roles.map((r) => (
              <li key={r.id}>
                <button
                  type="button"
                  onClick={() => setSelectedId(r.id)}
                  className={`flex w-full items-center justify-between px-4 py-2.5 text-left text-sm capitalize transition ${
                    selected.id === r.id ? 'bg-brand-light font-medium text-brand-dark' : 'hover:bg-stone-50'
                  }`}
                >
                  {r.name}
                  <span className="inline-flex items-center gap-1 text-xs text-stone-400"><Users className="size-3" /> {r.users_count}</span>
                </button>
              </li>
            ))}
          </ul>
        </Card>

        <PermissionMatrix
          key={selected.id}
          role={selected}
          modules={data.modules}
          readOnly={!canEdit || selected.locked}
          onSaved={() => queryClient.invalidateQueries({ queryKey: ['roles'] })}
        />
      </div>

      {creating && (
        <NewRoleModal
          onClose={() => setCreating(false)}
          onSaved={(role) => {
            setCreating(false)
            setSelectedId(role.id)
            queryClient.invalidateQueries({ queryKey: ['roles'] })
          }}
        />
      )}
    </div>
  )
}

function PermissionMatrix({ role, modules, readOnly, onSaved }) {
  const [permissions, setPermissions] = useState(new Set(role.permissions))
  const dirty = permissions.size !== role.permissions.length || role.permissions.some((p) => !permissions.has(p))

  const toggle = (name) =>
    setPermissions((prev) => {
      const next = new Set(prev)
      if (next.has(name)) {
        next.delete(name)
        // sin "ver" no tiene sentido el resto del módulo
        if (name.endsWith('.ver')) [...next].filter((p) => p.startsWith(name.split('.')[0] + '.')).forEach((p) => next.delete(p))
      } else {
        next.add(name)
        next.add(`${name.split('.')[0]}.ver`)
      }
      return next
    })

  const mutation = useMutation({
    mutationFn: () => saveRole({ id: role.id, permissions: [...permissions] }),
    onSuccess: onSaved,
  })

  return (
    <Card title={<span className="capitalize">{role.name}</span>}>
      {role.locked && (
        <p className="mb-4 rounded-lg bg-stone-50 px-3 py-2 text-sm text-stone-600">
          <Lock className="mr-1.5 inline size-3.5 align-[-2px]" />
          El administrador siempre tiene todos los permisos, para que la clínica nunca quede sin acceso.
        </p>
      )}

      <div className="divide-y divide-line">
        {Object.entries(modules).map(([module, actions]) => (
          <div key={module} className="flex flex-wrap items-center justify-between gap-3 py-3">
            <span className="text-sm font-medium">{MODULE_LABELS[module] ?? module}</span>
            <div className="flex flex-wrap gap-2">
              {actions.map((action) => {
                const name = `${module}.${action}`
                const checked = permissions.has(name)
                return (
                  <label
                    key={name}
                    className={`inline-flex cursor-pointer items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition ${
                      checked ? 'border-brand bg-brand-light text-brand-dark' : 'border-line text-muted'
                    } ${readOnly ? 'cursor-default' : 'hover:border-brand'}`}
                  >
                    <input type="checkbox" className="sr-only" checked={checked} disabled={readOnly} onChange={() => toggle(name)} />
                    {checked ? '✓' : '+'} {ACTION_LABELS[action] ?? action}
                  </label>
                )
              })}
            </div>
          </div>
        ))}
      </div>

      {!readOnly && (
        <div className="mt-4 flex items-center justify-end gap-3">
          {mutation.isSuccess && !dirty && <span className="text-sm text-emerald-700">Guardado ✓</span>}
          {mutation.error && <span className="text-sm text-red-600">No se pudo guardar.</span>}
          <Button variant="secondary" disabled={!dirty} onClick={() => setPermissions(new Set(role.permissions))}>Descartar</Button>
          <Button disabled={!dirty || mutation.isPending} onClick={() => mutation.mutate()}>Guardar permisos</Button>
        </div>
      )}
      <p className="mt-3 text-xs text-stone-400">Los cambios aplican a los usuarios del rol en su próxima acción.</p>
    </Card>
  )
}

function NewRoleModal({ onClose, onSaved }) {
  const [name, setName] = useState('')
  const mutation = useMutation({ mutationFn: () => saveRole({ name, permissions: [] }), onSuccess: onSaved })
  const error = mutation.error?.response?.data?.errors?.name?.[0]

  return (
    <Modal title="Nuevo rol" onClose={onClose}>
      <Field label="Nombre del rol" required error={error}>
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej. Peluquero, Auxiliar de farmacia" autoFocus />
      </Field>
      <p className="mt-2 text-xs text-muted">Se crea sin permisos; luego márcalos en la matriz.</p>
      <FormError message={mutation.error && !error ? 'No se pudo crear el rol.' : null} />
      <div className="mt-5 flex justify-end gap-2">
        <Button variant="secondary" onClick={onClose}>Cancelar</Button>
        <Button disabled={!name.trim() || mutation.isPending} onClick={() => mutation.mutate()}>Crear</Button>
      </div>
    </Modal>
  )
}
