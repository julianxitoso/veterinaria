import { ChevronLeft, ChevronRight } from 'lucide-react'

/**
 * Paginación para respuestas paginadas de Laravel (meta.current_page, meta.last_page).
 */
export default function Pagination({ meta, onPageChange }) {
  if (!meta || meta.last_page <= 1) return null

  const button = 'inline-flex size-8 items-center justify-center rounded-lg border border-line-strong bg-white text-stone-600 transition hover:bg-stone-50 disabled:opacity-40'

  return (
    <div className="flex items-center justify-between border-t border-line px-5 py-3 text-[13px] text-muted">
      <span className="tabular">
        {meta.from}–{meta.to} de {meta.total}
      </span>
      <div className="flex items-center gap-2">
        <span className="tabular mr-1">Página {meta.current_page} de {meta.last_page}</span>
        <button className={button} disabled={meta.current_page === 1} onClick={() => onPageChange(meta.current_page - 1)} aria-label="Anterior">
          <ChevronLeft className="size-4" />
        </button>
        <button className={button} disabled={meta.current_page === meta.last_page} onClick={() => onPageChange(meta.current_page + 1)} aria-label="Siguiente">
          <ChevronRight className="size-4" />
        </button>
      </div>
    </div>
  )
}
