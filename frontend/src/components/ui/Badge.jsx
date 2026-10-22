/**
 * Etiqueta de estado. `status` es una entrada de un mapa { label, className }.
 */
export default function Badge({ status }) {
  if (!status) return null
  return (
    <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2 py-0.5 text-[11.5px] font-medium ${status.className}`}>
      <span className="size-1.5 rounded-full bg-current opacity-70" />
      {status.label}
    </span>
  )
}
