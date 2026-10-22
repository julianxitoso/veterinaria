import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { Plus } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import Button from '../../components/ui/Button'
import { Input } from '../../components/ui/Form'
import { Card, EmptyState, ErrorState, PageHeader, Spinner } from '../../components/ui/Layout'
import Pagination from '../../components/ui/Pagination'
import { useCan } from '../../hooks/useCan'
import { useDebounce } from '../../hooks/useDebounce'
import { listClients } from '../../services/clientsService'

export default function ClientsListPage() {
  const [params, setParams] = useSearchParams()
  const page = Number(params.get('page') ?? 1)
  const [search, setSearch] = useState(params.get('search') ?? '')
  const debouncedSearch = useDebounce(search)
  const canCreate = useCan('pacientes.crear')

  // la búsqueda vive en la URL para conservarla al volver atrás
  useEffect(() => {
    if ((params.get('search') ?? '') !== debouncedSearch) {
      setParams(debouncedSearch ? { search: debouncedSearch } : {}, { replace: true })
    }
  }, [debouncedSearch, params, setParams])

  const { data, isPending, error } = useQuery({
    queryKey: ['clients', { page, search: debouncedSearch }],
    queryFn: () => listClients({ page, search: debouncedSearch }),
    placeholderData: keepPreviousData,
  })

  const goToPage = (p) => setParams({ ...(debouncedSearch && { search: debouncedSearch }), page: p })

  return (
    <div>
      <PageHeader
        title="Clientes"
        subtitle="Responsables de los pacientes"
        actions={canCreate && <Button icon={Plus} to="/clientes/nuevo">Nuevo cliente</Button>}
      />

      <Card flush>
        <div className="border-b border-line p-4">
          <Input
            type="search"
            placeholder="Buscar por nombre, documento, teléfono o email…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-md"
          />
        </div>

        {isPending ? (
          <Spinner />
        ) : error ? (
          <div className="p-4"><ErrorState error={error} /></div>
        ) : data.data.length === 0 ? (
          <EmptyState>No se encontraron clientes.</EmptyState>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-line text-xs text-muted">
                <tr>
                  <th className="px-4 py-3 font-medium">Nombre</th>
                  <th className="px-4 py-3 font-medium">Documento</th>
                  <th className="hidden px-4 py-3 font-medium sm:table-cell">Teléfono</th>
                  <th className="hidden px-4 py-3 font-medium md:table-cell">Ciudad</th>
                  <th className="px-4 py-3 text-center font-medium">Mascotas</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {data.data.map((client) => (
                  <tr key={client.id} className="hover:bg-stone-50">
                    <td className="px-4 py-3">
                      <Link to={`/clientes/${client.id}`} className="font-medium text-brand-dark hover:underline">
                        {client.name}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-stone-600">
                      {client.document ? `${client.document_type} ${client.document}` : '—'}
                    </td>
                    <td className="hidden px-4 py-3 text-stone-600 sm:table-cell">{client.phone ?? '—'}</td>
                    <td className="hidden px-4 py-3 text-stone-600 md:table-cell">{client.city ?? '—'}</td>
                    <td className="px-4 py-3 text-center">{client.pets_count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <Pagination meta={data?.meta} onPageChange={goToPage} />
      </Card>
    </div>
  )
}
