import { Plus } from 'lucide-react'
import { useState } from 'react'

/**
 * Sección plegable de formulario. Cerrada muestra solo "+ título";
 * `defaultOpen` la abre de entrada (ej. cuando ya tiene datos).
 */
export default function CollapsibleSection({ title, hint, defaultOpen = false, onOpen, children }) {
  const [open, setOpen] = useState(defaultOpen)

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => {
          setOpen(true)
          onOpen?.()
        }}
        className="group flex w-full items-center justify-between rounded-2xl border border-dashed border-line-strong bg-white/60 px-5 py-3.5 text-left transition hover:border-brand/50 hover:bg-white"
      >
        <span className="inline-flex items-center gap-2 text-sm font-medium text-stone-700 group-hover:text-brand-dark">
          <span className="flex size-6 items-center justify-center rounded-md bg-stone-100 text-stone-500 transition group-hover:bg-brand-light group-hover:text-brand-dark">
            <Plus className="size-3.5" />
          </span>
          {title}
        </span>
        {hint && <span className="hidden text-xs text-muted sm:inline">{hint}</span>}
      </button>
    )
  }

  return (
    <section className="animate-fade-in overflow-hidden rounded-2xl border border-line bg-white shadow-card">
      <header className="px-5 pt-4 pb-1">
        <h2 className="text-[15px] font-semibold text-ink">{title}</h2>
      </header>
      <div className="p-5 pt-3">{children}</div>
    </section>
  )
}
