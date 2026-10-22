import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { PawPrint } from 'lucide-react'
import { useEffect, useRef } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import Button from '../../components/ui/Button'
import { Field, FormError, Input } from '../../components/ui/Form'
import { Card, PageHeader, Spinner } from '../../components/ui/Layout'
import { useCan } from '../../hooks/useCan'
import { deleteLogo, getClinicSettings, updateClinicSettings, uploadLogo } from '../../services/adminService'
import { useTenantStore } from '../../store/tenantStore'
import { applyServerErrors } from '../../utils/apiErrors'
import SettingsTabs from './SettingsTabs'

// tonos apagados que se ven bien con los fondos cálidos de la interfaz
const PRESET_COLORS = ['#0d9488', '#3f9e8f', '#6b9a5e', '#4a86c5', '#5b6bd6', '#7c72c9', '#c4708a', '#c98a5b', '#5f6f7e']

const FIELDS = ['name', 'legal_name', 'tax_id', 'address', 'phone', 'email', 'primary_color']

/**
 * Identidad de la clínica: lo que se ve en la app, el login y los PDF.
 */
export default function ClinicSettingsPage() {
  const queryClient = useQueryClient()
  const updateTenant = useTenantStore((s) => s.update)
  const canEdit = useCan('configuracion.editar')
  const logoInput = useRef(null)

  const { data, isPending } = useQuery({ queryKey: ['clinic-settings'], queryFn: getClinicSettings })

  const {
    register,
    control,
    handleSubmit,
    reset,
    setValue,
    setError,
    formState: { errors, isSubmitting, isDirty },
  } = useForm()

  const color = useWatch({ control, name: 'primary_color' })
  const name = useWatch({ control, name: 'name' })

  useEffect(() => {
    if (data) reset(Object.fromEntries(FIELDS.map((k) => [k, data[k] ?? ''])))
  }, [data, reset])

  const onSaved = (saved) => {
    queryClient.setQueryData(['clinic-settings'], saved)
    updateTenant({ name: saved.name, primary_color: saved.primary_color, logo_url: saved.logo_url })
  }

  const save = useMutation({ mutationFn: updateClinicSettings, onSuccess: onSaved })
  const logo = useMutation({ mutationFn: uploadLogo, onSuccess: onSaved, onError: (e) => alert(e.response?.data?.errors?.logo?.[0] ?? 'No se pudo subir el logo.') })
  const removeLogo = useMutation({ mutationFn: deleteLogo, onSuccess: onSaved })

  const onSubmit = (values) =>
    save.mutateAsync(values).then((saved) => reset(Object.fromEntries(FIELDS.map((k) => [k, saved[k] ?? ''])))).catch((e) => applyServerErrors(e, setError))

  if (isPending) return <Spinner />

  const err = (f) => errors[f]?.message

  return (
    <div className="max-w-4xl">
      <PageHeader title="Configuración" subtitle="Datos y marca de la clínica" />
      <SettingsTabs />

      <form onSubmit={handleSubmit(onSubmit)} className="grid gap-5 lg:grid-cols-3" noValidate>
        <div className="space-y-5 lg:col-span-2">
          <Card title="Datos de la clínica">
            <fieldset disabled={!canEdit} className="grid gap-4 sm:grid-cols-2">
              <Field label="Nombre comercial" required error={err('name')} className="sm:col-span-2">
                <Input {...register('name')} />
              </Field>
              <Field label="Razón social" error={err('legal_name')}><Input {...register('legal_name')} /></Field>
              <Field label="NIT" error={err('tax_id')}><Input {...register('tax_id')} /></Field>
              <Field label="Dirección" error={err('address')} className="sm:col-span-2"><Input {...register('address')} /></Field>
              <Field label="Teléfono" error={err('phone')}><Input {...register('phone')} /></Field>
              <Field label="Email" error={err('email')}><Input type="email" {...register('email')} /></Field>
            </fieldset>
            <p className="mt-3 text-xs text-muted">Estos datos aparecen en el encabezado de facturas, recetas y demás documentos.</p>
          </Card>

          <Card title="Color institucional">
            <div className="flex flex-wrap items-center gap-2">
              {PRESET_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  disabled={!canEdit}
                  onClick={() => setValue('primary_color', c, { shouldDirty: true })}
                  className={`h-9 w-9 rounded-full border-2 transition ${color === c ? 'scale-110 border-stone-900' : 'border-white shadow'}`}
                  style={{ backgroundColor: c }}
                  aria-label={c}
                />
              ))}
              <label className="ml-2 inline-flex items-center gap-2 text-sm text-stone-600">
                Otro:
                <input type="color" disabled={!canEdit} {...register('primary_color')} className="h-9 w-12 cursor-pointer rounded border border-line-strong" />
              </label>
            </div>
            {err('primary_color') && <p className="mt-1 text-xs text-red-600">{err('primary_color')}</p>}
          </Card>

          {canEdit && (
            <div className="flex items-center justify-end gap-3">
              <FormError message={errors.root?.message} />
              {save.isSuccess && !isDirty && <span className="text-sm text-emerald-700">Cambios guardados ✓</span>}
              <Button type="submit" disabled={isSubmitting || !isDirty}>Guardar cambios</Button>
            </div>
          )}
        </div>

        <div className="space-y-5">
          <Card title="Logo">
            <div className="flex h-28 items-center justify-center rounded-lg border border-dashed border-line-strong bg-stone-50">
              {data.logo_url ? (
                <img src={data.logo_url} alt="Logo" className="max-h-24 max-w-full object-contain" />
              ) : (
                <span className="text-sm text-stone-400">Sin logo</span>
              )}
            </div>
            {canEdit && (
              <div className="mt-3 flex gap-2">
                <Button variant="secondary" className="flex-1" onClick={() => logoInput.current.click()} disabled={logo.isPending}>
                  {logo.isPending ? 'Subiendo…' : data.logo_url ? 'Cambiar' : 'Subir logo'}
                </Button>
                {data.logo_url && (
                  <Button variant="ghost" className="text-red-600" onClick={() => removeLogo.mutate()}>Quitar</Button>
                )}
                <input
                  ref={logoInput}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files[0]) logo.mutate(e.target.files[0])
                    e.target.value = ''
                  }}
                />
              </div>
            )}
            <p className="mt-2 text-xs text-stone-400">PNG, JPG o WEBP, máximo 2 MB. Ideal con fondo transparente.</p>
          </Card>

          {/* vista previa con el color elegido, antes de guardar */}
          <Card title="Vista previa">
            <div className="overflow-hidden rounded-lg border border-line" style={{ '--brand': color }}>
              <div className="flex items-center gap-2 bg-white px-3 py-2">
                <span className="flex size-7 items-center justify-center rounded-lg bg-brand text-white"><PawPrint className="size-3.5" /></span>
                <span className="truncate text-sm font-semibold">{name || 'Clínica'}</span>
              </div>
              <div className="space-y-2 bg-stone-50 p-3">
                <div className="rounded bg-brand-light px-2 py-1 text-xs font-medium text-brand-dark">Pacientes</div>
                <button type="button" className="w-full rounded bg-brand px-2 py-1.5 text-xs font-medium text-white">Nueva consulta</button>
              </div>
            </div>
          </Card>
        </div>
      </form>
    </div>
  )
}
