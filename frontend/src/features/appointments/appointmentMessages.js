/**
 * Variables disponibles en las plantillas de WhatsApp de citas.
 */
export const MESSAGE_VARIABLES = {
  cliente: 'Nombre del cliente',
  mascota: 'Nombre de la mascota',
  fecha: 'Fecha (ej. viernes 23 de octubre)',
  hora: 'Hora (ej. 9:30 a. m.)',
  veterinario: 'Veterinario',
  clinica: 'Nombre de la clínica',
  direccion: 'Dirección de la clínica',
  telefono: 'Teléfono de la clínica',
}

export const MESSAGE_KINDS = {
  confirmed: 'Confirmación de cita',
  reminder: 'Recordatorio',
  cancelled: 'Cancelación',
}

export function appointmentMessageValues(appointment, clinic) {
  const start = new Date(appointment.starts_at)
  const fullName = appointment.client?.name ?? appointment.contact.name ?? ''

  return {
    // solo el primer nombre suena más cercano en un chat
    cliente: fullName.split(' ')[0],
    mascota: appointment.pet?.name ?? appointment.contact.pet_name ?? 'tu mascota',
    // "viernes 23 de octubre" (sin la coma que agrega es-CO)
    fecha: start.toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long' }).replace(',', ''),
    hora: start.toLocaleTimeString('es-CO', { hour: 'numeric', minute: '2-digit' }),
    veterinario: appointment.veterinarian?.name ?? '',
    clinica: clinic?.name ?? '',
    direccion: clinic?.address ?? '',
    telefono: clinic?.phone ?? '',
  }
}
