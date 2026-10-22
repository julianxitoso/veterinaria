import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Plus } from 'lucide-react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import Button from '../../components/ui/Button'
import { Card, DetailList, EmptyState, ErrorState, PageHeader, Spinner } from '../../components/ui/Layout'
import { useCan } from '../../hooks/useCan'
import { deleteClient, getClient } from '../../services/clientsService'
import PetAvatar from '../pets/PetAvatar'
import { sexLabel } from '../pets/petLabels'
import { DOCUMENT_TYPES } from './clientLabels'

export default function ClientDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const canEdit = useCan('pacientes.editar')
  const canDelete = useCan('pacientes.eliminar')
  const canCreatePet = useCan('pacientes.crear')

  const { data: client, isPending, error } = useQuery({
    queryKey: ['client', id],
    queryFn: () => getClient(id),
  })

  const removal = useMutation({
    mutationFn: () => deleteClient(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] })
      navigate('/clientes', { replace: true })
    },
    onError: (err) => alert(err.response?.data?.message ?? 'No se pudo eliminar el cliente.'),
  })

  if (isPending) return <Spinner />
  if (error) return <ErrorState error={error} />

  const handleDelete = () => {
    if (confirm(`¿Eliminar al cliente ${client.name}?`)) removal.mutate()
  }

  return (
    <div>
      <PageHeader
        title={client.name}
        subtitle={client.document && `${DOCUMENT_TYPES[client.document_type] ?? client.document_type} ${client.document}`}
        back="/clientes"
        actions={
          <>
            {canEdit && <Button variant="secondary" to={`/clientes/${id}/editar`}>Editar</Button>}
            {canDelete && client.pets.length === 0 && (
              <Button variant="danger" onClick={handleDelete} disabled={removal.isPending}>Eliminar</Button>
            )}
          </>
        }
      />

      <div className="grid gap-6 lg:grid-cols-5">
        <Card title="Datos de contacto" className="lg:col-span-2">
          <DetailList
            items={[
              ['Teléfono', client.phone],
              ['Email', client.email],
              ['Dirección', client.address],
              ['Ciudad', client.city],
              ['Observaciones', client.notes],
            ]}
          />
        </Card>

        <Card
          title={`Mascotas (${client.pets.length})`}
          className="lg:col-span-3"
          actions={
            canCreatePet && (
              <Button variant="soft" size="sm" icon={Plus} to={`/pacientes/nuevo?cliente=${client.id}`}>
                Agregar mascota
              </Button>
            )
          }
        >
          {client.pets.length === 0 ? (
            <EmptyState>Este cliente aún no tiene mascotas registradas.</EmptyState>
          ) : (
            <ul className="divide-y divide-line">
              {client.pets.map((pet) => (
                <li key={pet.id}>
                  <Link to={`/pacientes/${pet.id}`} className="-mx-2 flex items-center gap-3 rounded-lg px-2 py-3 hover:bg-stone-50">
                    <PetAvatar pet={pet} />
                    <div className="min-w-0">
                      <p className="font-medium">{pet.name}</p>
                      <p className="truncate text-sm text-muted">
                        {[pet.species, pet.breed, sexLabel(pet.sex), pet.age].filter(Boolean).join(' · ')}
                      </p>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  )
}
