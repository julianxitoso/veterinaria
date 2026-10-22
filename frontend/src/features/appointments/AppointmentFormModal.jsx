import { useMutation, useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import Button from '../../components/ui/Button'
import { Field, FormError, Input, Select, Textarea } from '../../components/ui/Form'
import Modal from '../../components/ui/Modal'
import { saveAppointment } from '../../services/appointmentsService'
import { listVeterinarians } from '../../services/consultationsService'
import PetPicker from '../pets/PetPicker'

const DURATIONS = [15, 20, 30, 45, 60, 90, 120]

/**
 * Crear o reprogramar una cita. `initial`: { id?, pet?, user_id?, date, time, duration?, reason?, notes? }
 */
export default function AppointmentFormModal({ initial, slotMinutes = 30, onClose, onSaved }) {
  const isEdit = Boolean(initial.id)
  const [pet, setPet] = useState(initial.pet ?? null)
  const [values, setValues] = useState({
    user_id: initial.user_id ? String(initial.user_id) : '',
    date: initial.date,
    time: initial.time ?? '08:00',
    duration: String(initial.duration ?? slotMinutes),
    reason: initial.reason ?? '',
    notes: initial.notes ?? '',
  })
  const set = (f) => (e) => setValues((v) => ({ ...v, [f]: e.target.value }))

  const { data: vets } = useQuery({ queryKey: ['veterinarians'], queryFn: listVeterinarians, staleTime: 5 * 60_000 })

  const mutation = useMutation({
    mutationFn: () =>
      saveAppointment({
        id: initial.id,
        pet_id: pet?.id,
        user_id: Number(values.user_id),
        starts_at: `${values.date} ${values.time}`,
        duration: Number(values.duration),
        reason: values.reason,
        notes: values.notes || null,
      }),
    onSuccess: onSaved,
  })

  const errors = mutation.error?.response?.data?.errors ?? {}
  // una solicitud online sin mascota registrada aún se puede reprogramar sin elegirla
  const needsPet = !isEdit || initial.pet
  const canSave = (!needsPet || pet) && values.user_id && values.reason.trim()

  return (
    <Modal title={isEdit ? 'Reprogramar cita' : 'Nueva cita'} onClose={onClose}>
      <div className="space-y-4">
        {needsPet && (
          <Field label="Paciente" required error={errors.pet_id?.[0]}>
            <PetPicker value={pet} onChange={setPet} />
          </Field>
        )}
        {pet?.allergies && <p className="rounded-xl bg-rose-50/70 px-3 py-2 text-sm text-rose-800">Alergias: {pet.allergies}</p>}

        <Field label="Veterinario" required error={errors.user_id?.[0]}>
          <Select value={values.user_id} onChange={set('user_id')}>
            <option value="">Selecciona…</option>
            {vets?.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
          </Select>
        </Field>

        <div className="grid grid-cols-3 gap-3">
          <Field label="Fecha" required>
            <Input type="date" value={values.date} onChange={set('date')} />
          </Field>
          <Field label="Hora" required>
            <Input type="time" step={slotMinutes * 60} value={values.time} onChange={set('time')} />
          </Field>
          <Field label="Duración">
            <Select value={values.duration} onChange={set('duration')}>
              {DURATIONS.map((d) => <option key={d} value={d}>{d} min</option>)}
            </Select>
          </Field>
        </div>
        {errors.starts_at && <p className="text-sm text-red-600">{errors.starts_at[0]}</p>}

        <Field label="Motivo" required error={errors.reason?.[0]}>
          <Input value={values.reason} onChange={set('reason')} placeholder="Ej. Vacunación, control, revisión…" />
        </Field>
        <Field label="Notas internas">
          <Textarea rows={2} value={values.notes} onChange={set('notes')} />
        </Field>

        <FormError message={mutation.error && !Object.keys(errors).length ? 'No se pudo guardar la cita.' : null} />
      </div>

      <div className="mt-5 flex justify-end gap-2">
        <Button variant="secondary" onClick={onClose}>Cancelar</Button>
        <Button onClick={() => mutation.mutate()} disabled={!canSave || mutation.isPending}>
          {mutation.isPending ? 'Guardando…' : isEdit ? 'Guardar cambios' : 'Agendar'}
        </Button>
      </div>
    </Modal>
  )
}
