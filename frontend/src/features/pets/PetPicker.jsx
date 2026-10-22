import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { Input } from '../../components/ui/Form'
import { useDebounce } from '../../hooks/useDebounce'
import { listPets } from '../../services/petsService'
import PetAvatar from './PetAvatar'

/**
 * Buscador de mascotas (por nombre o datos del dueño). `value` es la mascota o null.
 */
export default function PetPicker({ value, onChange, invalid, disabled }) {
  const [search, setSearch] = useState('')
  const [open, setOpen] = useState(false)
  const debounced = useDebounce(search)

  const { data, isFetching } = useQuery({
    queryKey: ['pets', 'picker', debounced],
    queryFn: () => listPets({ search: debounced, per_page: 8 }),
    enabled: open,
  })

  if (value) {
    return (
      <div className="flex items-center justify-between gap-3 rounded-lg border border-line-strong bg-stone-50 px-3 py-2 text-sm">
        <span className="flex min-w-0 items-center gap-3">
          <PetAvatar pet={value} />
          <span className="min-w-0">
            <span className="block font-medium">{value.name}</span>
            <span className="block truncate text-muted">
              {[value.species, value.breed, value.client?.name && `Dueño: ${value.client.name}`].filter(Boolean).join(' · ')}
            </span>
          </span>
        </span>
        {!disabled && (
          <button type="button" className="shrink-0 text-brand-dark hover:underline" onClick={() => onChange(null)}>
            Cambiar
          </button>
        )}
      </div>
    )
  }

  return (
    <div className="relative">
      <Input
        type="search"
        placeholder="Buscar paciente por nombre o por dueño…"
        value={search}
        aria-invalid={invalid}
        onChange={(e) => setSearch(e.target.value)}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
      />

      {open && (
        <ul className="absolute z-10 mt-1 max-h-72 w-full overflow-auto rounded-lg border border-line bg-white py-1 text-sm shadow-lg">
          {isFetching && !data ? (
            <li className="px-3 py-2 text-muted">Buscando…</li>
          ) : data?.data.length ? (
            data.data.map((pet) => (
              <li key={pet.id}>
                <button
                  type="button"
                  className="flex w-full items-center gap-3 px-3 py-2 text-left hover:bg-stone-50"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    onChange(pet)
                    setSearch('')
                    setOpen(false)
                  }}
                >
                  <PetAvatar pet={pet} />
                  <span>
                    <span className="block font-medium">{pet.name}</span>
                    <span className="text-muted">{pet.species} · {pet.client.name}</span>
                  </span>
                </button>
              </li>
            ))
          ) : (
            <li className="px-3 py-2 text-muted">Sin resultados.</li>
          )}
        </ul>
      )}
    </div>
  )
}
