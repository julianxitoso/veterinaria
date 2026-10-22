import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { Input } from '../../components/ui/Form'
import { useDebounce } from '../../hooks/useDebounce'
import { listClients } from '../../services/clientsService'

/**
 * Buscador de clientes para seleccionar el dueño de una mascota.
 * `value` es el cliente seleccionado ({ id, name, ... }) o null.
 */
export default function ClientPicker({ value, onChange, invalid }) {
  const [search, setSearch] = useState('')
  const [open, setOpen] = useState(false)
  const debounced = useDebounce(search)

  const { data, isFetching } = useQuery({
    queryKey: ['clients', 'picker', debounced],
    queryFn: () => listClients({ search: debounced, per_page: 8 }),
    enabled: open,
  })

  if (value) {
    return (
      <div className="flex items-center justify-between rounded-lg border border-line-strong bg-stone-50 px-3 py-2 text-sm">
        <span>
          <span className="font-medium">{value.name}</span>
          {value.document && <span className="text-muted"> · {value.document}</span>}
        </span>
        <button type="button" className="text-brand-dark hover:underline" onClick={() => onChange(null)}>
          Cambiar
        </button>
      </div>
    )
  }

  return (
    <div className="relative">
      <Input
        type="search"
        placeholder="Buscar dueño por nombre, documento o teléfono…"
        value={search}
        aria-invalid={invalid}
        onChange={(e) => setSearch(e.target.value)}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
      />

      {open && (
        <ul className="absolute z-10 mt-1 max-h-64 w-full overflow-auto rounded-lg border border-line bg-white py-1 text-sm shadow-lg">
          {isFetching && !data ? (
            <li className="px-3 py-2 text-muted">Buscando…</li>
          ) : data?.data.length ? (
            data.data.map((client) => (
              <li key={client.id}>
                <button
                  type="button"
                  className="w-full px-3 py-2 text-left hover:bg-stone-50"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    onChange(client)
                    setSearch('')
                    setOpen(false)
                  }}
                >
                  <span className="font-medium">{client.name}</span>
                  <span className="text-muted"> {[client.document, client.phone].filter(Boolean).join(' · ')}</span>
                </button>
              </li>
            ))
          ) : (
            <li className="px-3 py-2 text-muted">Sin resultados. Registra primero al cliente.</li>
          )}
        </ul>
      )}
    </div>
  )
}
