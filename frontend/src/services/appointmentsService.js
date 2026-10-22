import api from './api'

export async function listAppointments(params) {
  const { data } = await api.get('/appointments', { params })
  return data.data
}

export async function getAgendaDay(date) {
  const { data } = await api.get('/appointments/day', { params: { date } })
  return data.data
}

export async function saveAppointment(values) {
  const { data } = values.id ? await api.put(`/appointments/${values.id}`, values) : await api.post('/appointments', values)
  return data.data
}

export async function changeAppointmentStatus(id, status, reason) {
  const { data } = await api.post(`/appointments/${id}/status`, { status, reason })
  return data.data
}

export async function getSchedules() {
  const { data } = await api.get('/schedules')
  return data
}

export async function saveSchedule(userId, blocks) {
  const { data } = await api.put(`/schedules/${userId}`, { blocks })
  return data
}

export async function saveAppointmentSettings(values) {
  const { data } = await api.put('/settings/appointments', values)
  return data.data
}

// agenda pública (sin sesión)
export async function getPublicBooking() {
  const { data } = await api.get('/public/booking')
  return data.data
}

export async function getPublicSlots(date, userId) {
  const { data } = await api.get('/public/booking/slots', { params: { date, user_id: userId || undefined } })
  return data.data
}

export async function createPublicBooking(values) {
  const { data } = await api.post('/public/booking', values)
  return data.data
}
