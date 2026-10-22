import { X } from 'lucide-react'
import { useEffect } from 'react'

/**
 * Ventana modal. Se cierra con Escape o clic fuera.
 */
export default function Modal({ title, onClose, children }) {
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-40 flex animate-fade-in items-end justify-center bg-stone-900/25 p-4 backdrop-blur-[2px] sm:items-center"
      onMouseDown={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        className="max-h-[90vh] w-full max-w-md animate-pop-in overflow-y-auto rounded-2xl bg-white shadow-pop"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <header className="flex items-center justify-between px-5 pt-4">
          <h2 className="text-[15px] font-semibold text-ink">{title}</h2>
          <button type="button" onClick={onClose} className="rounded-lg p-1.5 text-stone-400 transition hover:bg-stone-100 hover:text-ink" aria-label="Cerrar">
            <X className="size-4" />
          </button>
        </header>
        <div className="p-5 pt-3">{children}</div>
      </div>
    </div>
  )
}
