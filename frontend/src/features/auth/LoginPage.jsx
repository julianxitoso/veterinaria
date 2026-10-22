import { yupResolver } from '@hookform/resolvers/yup'
import { ArrowRight, CalendarDays, HeartPulse, PawPrint, ShieldCheck } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import * as yup from 'yup'
import Button from '../../components/ui/Button'
import { Field, FormError, Input } from '../../components/ui/Form'
import { login } from '../../services/authService'
import { useAuthStore } from '../../store/authStore'
import { useTenantStore } from '../../store/tenantStore'

const schema = yup.object({
  email: yup.string().email('Email inválido').required('El email es obligatorio'),
  password: yup.string().required('La contraseña es obligatoria'),
})

const CURRENT_YEAR = new Date().getFullYear()

const HIGHLIGHTS = [
  { icon: HeartPulse, text: 'Historia clínica completa de cada paciente' },
  { icon: CalendarDays, text: 'Agenda por veterinario y citas en línea' },
  { icon: ShieldCheck, text: 'Información segura y separada por clínica' },
]

export default function LoginPage() {
  const tenant = useTenantStore((state) => state.tenant)
  const { token, setSession } = useAuthStore()
  const navigate = useNavigate()
  const location = useLocation()

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: yupResolver(schema) })

  if (token) {
    return <Navigate to="/" replace />
  }

  const onSubmit = async ({ email, password }) => {
    try {
      const data = await login(email, password)
      setSession(data.token, data.user)
      navigate(location.state?.from?.pathname ?? '/', { replace: true })
    } catch (error) {
      const message =
        error.response?.data?.errors?.email?.[0] ??
        error.response?.data?.message ??
        'No se pudo iniciar sesión.'
      setError('root', { message })
    }
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* panel de marca */}
      <div className="relative hidden overflow-hidden bg-brand-light lg:flex lg:flex-col lg:justify-between lg:p-12">
        <div className="pointer-events-none absolute -right-24 -top-24 size-96 rounded-full bg-brand/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 -left-16 size-96 rounded-full bg-brand/10 blur-3xl" />

        <div className="relative flex items-center gap-3">
          <Logo tenant={tenant} />
          <span className="text-lg font-semibold tracking-tight">{tenant.name}</span>
        </div>

        <div className="relative max-w-md">
          <h2 className="text-[32px] font-semibold leading-tight tracking-tight text-ink">
            Cuidamos a quienes más quieres.
          </h2>
          <p className="mt-3 text-[15px] text-stone-600">Todo lo de la clínica en un solo lugar, simple y ordenado.</p>
          <ul className="mt-8 space-y-3">
            {HIGHLIGHTS.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-center gap-3 text-sm text-stone-700">
                <span className="flex size-8 items-center justify-center rounded-lg bg-white/80 text-brand shadow-card">
                  <Icon className="size-4" />
                </span>
                {text}
              </li>
            ))}
          </ul>
        </div>

        <PawPrint className="pointer-events-none absolute -bottom-6 right-10 size-48 -rotate-12 text-brand/[0.07]" strokeWidth={1.25} />
        <p className="relative text-xs text-stone-500">© {CURRENT_YEAR} {tenant.name}</p>
      </div>

      {/* formulario */}
      <div className="flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm animate-pop-in">
          <div className="mb-8 lg:hidden">
            <Logo tenant={tenant} />
            <p className="mt-3 text-lg font-semibold">{tenant.name}</p>
          </div>

          <h1 className="text-[24px] font-semibold tracking-tight">Bienvenido de nuevo</h1>
          <p className="mt-1 text-sm text-muted">Ingresa con tu cuenta de la clínica.</p>

          <form onSubmit={handleSubmit(onSubmit)} className="mt-8 space-y-4" noValidate>
            <Field label="Email" error={errors.email?.message}>
              <Input type="email" autoComplete="username" placeholder="tu@correo.com" {...register('email')} aria-invalid={!!errors.email} />
            </Field>

            <Field label="Contraseña" error={errors.password?.message}>
              <Input type="password" autoComplete="current-password" placeholder="••••••••" {...register('password')} aria-invalid={!!errors.password} />
            </Field>

            <FormError message={errors.root?.message} />

            <Button type="submit" size="lg" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? 'Ingresando…' : 'Ingresar'}
            </Button>
          </form>

          {tenant.online_booking && (
            <Link
              to="/agendar"
              className="group mt-8 flex items-center gap-3 rounded-xl border border-line bg-white p-3.5 text-sm transition hover:border-brand/40 hover:shadow-card"
            >
              <span className="flex size-9 items-center justify-center rounded-lg bg-brand-light text-brand">
                <CalendarDays className="size-4" />
              </span>
              <span className="flex-1">
                <span className="block font-medium text-ink">¿Eres cliente?</span>
                <span className="text-muted">Agenda la cita de tu mascota</span>
              </span>
              <ArrowRight className="size-4 text-stone-300 transition group-hover:translate-x-0.5 group-hover:text-brand" />
            </Link>
          )}
        </div>
      </div>
    </div>
  )
}

function Logo({ tenant }) {
  return tenant.logo_url ? (
    <img src={tenant.logo_url} alt={tenant.name} className="h-10 w-auto object-contain" />
  ) : (
    <span className="flex size-10 items-center justify-center rounded-xl bg-brand text-white shadow-sm shadow-brand/30">
      <PawPrint className="size-5" />
    </span>
  )
}
