import { ArrowLeft, Inbox } from 'lucide-react'
import { Link } from 'react-router-dom'

export function PageHeader({ title, subtitle, back, actions }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        {back && (
          <Link to={back} className="mb-2 inline-flex items-center gap-1 text-[13px] text-muted transition hover:text-ink">
            <ArrowLeft className="size-3.5" /> Volver
          </Link>
        )}
        <h1 className="truncate text-[22px] font-semibold tracking-tight text-ink">{title}</h1>
        {subtitle && <p className="mt-0.5 text-sm text-muted">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  )
}

/**
 * Contenedor base. `flush` quita el padding interno (útil para tablas y listas).
 */
export function Card({ title, actions, flush = false, className = '', children }) {
  return (
    <section className={`overflow-hidden rounded-2xl border border-line bg-white shadow-card ${className}`}>
      {(title || actions) && (
        <header className={`flex items-center justify-between gap-3 px-5 pt-4 ${flush ? 'border-b border-line pb-3' : 'pb-1'}`}>
          <h2 className="text-[15px] font-semibold text-ink">{title}</h2>
          {actions}
        </header>
      )}
      <div className={flush ? '' : 'p-5 pt-3'}>{children}</div>
    </section>
  )
}

export function Spinner({ label = 'Cargando…' }) {
  return (
    <div className="flex items-center justify-center gap-2.5 py-12 text-sm text-muted">
      <span className="size-4 animate-spin rounded-full border-2 border-line-strong border-t-brand" />
      {label}
    </div>
  )
}

export function EmptyState({ icon: Icon = Inbox, children }) {
  return (
    <div className="flex flex-col items-center gap-2 py-12 text-center text-sm text-muted">
      <span className="flex size-10 items-center justify-center rounded-full bg-stone-100 text-stone-400">
        <Icon className="size-5" />
      </span>
      {children}
    </div>
  )
}

export function ErrorState({ error }) {
  const message = error?.response?.status === 404 ? 'Registro no encontrado.' : 'Ocurrió un error al cargar la información.'
  return <div className="rounded-2xl border border-red-100 bg-red-50 p-6 text-sm text-red-700">{message}</div>
}

/**
 * Lista de pares etiqueta/valor para fichas de detalle.
 */
export function DetailList({ items }) {
  return (
    <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
      {items.map(([label, value]) => (
        <div key={label}>
          <dt className="text-xs text-muted">{label}</dt>
          <dd className="mt-0.5 whitespace-pre-line text-sm text-ink">{value || <span className="text-stone-300">—</span>}</dd>
        </div>
      ))}
    </dl>
  )
}

/**
 * Tarjeta de indicador para tableros.
 */
export function StatCard({ icon: Icon, label, value, hint, tone = 'brand', to }) {
  const tones = {
    brand: 'bg-brand-light text-brand-dark',
    amber: 'bg-amber-50 text-amber-600',
    rose: 'bg-rose-50 text-rose-600',
    sky: 'bg-sky-50 text-sky-600',
    violet: 'bg-violet-50 text-violet-600',
    stone: 'bg-stone-100 text-stone-500',
  }

  const content = (
    <>
      <div className="flex items-start justify-between gap-3">
        <span className="text-[13px] font-medium text-muted">{label}</span>
        {Icon && (
          <span className={`flex size-8 items-center justify-center rounded-lg ${tones[tone]}`}>
            <Icon className="size-4" />
          </span>
        )}
      </div>
      <p className="tabular mt-2 truncate text-[20px] font-semibold tracking-tight text-ink sm:text-[26px]">{value}</p>
      {hint && <p className="mt-0.5 line-clamp-2 text-xs text-muted">{hint}</p>}
    </>
  )

  const classes = 'block rounded-2xl border border-line bg-white p-3.5 shadow-card transition sm:p-4'

  return to ? (
    <Link to={to} className={`${classes} hover:border-line-strong hover:shadow-pop`}>{content}</Link>
  ) : (
    <div className={classes}>{content}</div>
  )
}
