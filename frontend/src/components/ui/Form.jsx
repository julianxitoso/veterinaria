const baseControl =
  'rounded-lg border border-line-strong bg-white px-3 py-2 text-sm text-ink placeholder:text-stone-400 outline-none transition focus:border-brand focus:ring-4 focus:ring-brand/10 disabled:cursor-not-allowed disabled:bg-stone-50 disabled:text-stone-500 aria-invalid:border-red-300 aria-invalid:focus:ring-red-100'

/**
 * Ancho completo por defecto, salvo que se pase un ancho propio (w-auto, w-40…):
 * en Tailwind gana la clase definida después en el CSS, no la última del atributo.
 */
function control(className) {
  return `${baseControl} ${/(^|\s)w-/.test(className) ? '' : 'w-full'} ${className}`
}

export function Field({ label, error, required, hint, className = '', children }) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-1.5 block text-[13px] font-medium text-stone-700">
        {label}
        {required && <span className="text-red-400"> *</span>}
      </span>
      {children}
      {hint && !error && <span className="mt-1 block text-xs text-muted">{hint}</span>}
      {error && <span className="mt-1 block text-xs text-red-600">{error}</span>}
    </label>
  )
}

export function Input({ className = '', ...props }) {
  return <input className={control(className)} {...props} />
}

export function Select({ className = '', children, ...props }) {
  return (
    <select
      className={`${control(className)} appearance-none bg-[url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%239a9a95' stroke-width='2'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")] bg-[length:16px] bg-[right_0.6rem_center] bg-no-repeat pr-9`}
      {...props}
    >
      {children}
    </select>
  )
}

export function Textarea({ className = '', rows = 3, ...props }) {
  return <textarea rows={rows} className={`${control(className)} resize-y`} {...props} />
}

export function Checkbox({ label, ...props }) {
  return (
    <label className="inline-flex cursor-pointer items-center gap-2.5 text-sm text-stone-700">
      <input type="checkbox" className="size-4 rounded border-line-strong accent-brand" {...props} />
      {label}
    </label>
  )
}

export function FormError({ message }) {
  if (!message) return null
  return <p className="rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-700">{message}</p>
}
