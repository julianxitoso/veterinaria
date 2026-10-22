import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { Plus } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import Button from '../../components/ui/Button'
import { Input, Select } from '../../components/ui/Form'
import { Card, EmptyState, ErrorState, PageHeader, Spinner } from '../../components/ui/Layout'
import Pagination from '../../components/ui/Pagination'
import { useCan } from '../../hooks/useCan'
import { useDebounce } from '../../hooks/useDebounce'
import { listPets } from '../../services/petsService'
import PetAvatar from './PetAvatar'
import { SPECIES, sexLabel } from './petLabels'

export default function PetsListPage() {
  const [params, setParams] = useSearchParams()
  const page = Number(params.get('page') ?? 1)
  const species = params.get('species') ?? ''
  const [search, setSearch] = useState(params.get('search') ?? '')
  const debouncedSearch = useDebounce(search)
  const canCreate = useCan('pacientes.crear')

  const updateParams = (changes) => {
    const next = { search: debouncedSearch, species, ...changes }
    setParams(Object.fromEntries(Object.entries(next).filter(([, v]) => v)), { replace: true })
  }

  useEffect(() => {
    if ((params.get('search') ?? '') !== debouncedSearch) {
      const next = { search: debouncedSearch, species: params.get('species') }
      setParams(Object.fromEntries(Object.entries(next).filter(([, v]) => v)), { replace: true })
    }
  }, [debouncedSearch, params, setParams])

  const { data, isPending, error } = useQuery({
    queryKey: ['pets', { page, search: debouncedSearch, species }],
    queryFn: () => listPets({ page, search: debouncedSearch, species }),
    placeholderData: keepPreviousData,
  })

  return (
    <div>
      <PageHeader
        title="Pacientes"
        subtitle="Mascotas registradas en la clínica"
        actions={canCreate && <Button icon={Plus} to="/pacientes/nuevo">Nueva mascota</Button>}
      />

      <Card flush>
        <div className="flex flex-wrap gap-3 border-b border-line p-4">
          <Input
            type="search"
            placeholder="Buscar por nombre, microchip o dueño (nombre, documento, teléfono)…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="min-w-[220px] max-w-md flex-1"
          />
          <Select value={species} onChange={(e) => updateParams({ species: e.target.value, page: '' })} className="w-auto">
            <option value="">Todas las especies</option>
            {SPECIES.map((s) => <option key={s} value={s}>{s}</option>)}
          </Select>
        </div>

        {isPending ? (
          <Spinner />
        ) : error ? (
          <div className="p-4"><ErrorState error={error} /></div>
        ) : data.data.length === 0 ? (
          <EmptyState>No se encontraron mascotas.</EmptyState>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-line text-xs text-muted">
                <tr>
                  <th className="px-4 py-3 font-medium">Paciente</th>
                  <th className="hidden px-4 py-3 font-medium sm:table-cell">Sexo</th>
                  <th className="hidden px-4 py-3 font-medium md:table-cell">Edad</th>
                  <th className="px-4 py-3 font-medium">Dueño</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {data.data.map((pet) => (
                  <tr key={pet.id} className="hover:bg-stone-50">
                    <td className="px-4 py-3">
                      <Link to={`/pacientes/${pet.id}`} className="flex items-center gap-3">
                        <PetAvatar pet={pet} />
                        <span>
                          <span className="block font-medium text-brand-dark hover:underline">{pet.name}</span>
                          <span className="text-xs text-muted">{[pet.species, pet.breed].filter(Boolean).join(' · ')}</span>
                        </span>
                      </Link>
                    </td>
                    <td className="hidden px-4 py-3 text-stone-600 sm:table-cell">{sexLabel(pet.sex)}</td>
                    <td className="hidden px-4 py-3 text-stone-600 md:table-cell">{pet.age ?? '—'}</td>
                    <td className="px-4 py-3">
                      <Link to={`/clientes/${pet.client.id}`} className="hover:text-brand-dark hover:underline">
                        {pet.client.name}
                      </Link>
                      {pet.client.phone && <span className="block text-xs text-muted">{pet.client.phone}</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <Pagination meta={data?.meta} onPageChange={(p) => updateParams({ page: String(p) })} />
      </Card>
    </div>
  )
}
