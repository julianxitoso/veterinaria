import api from './api'

export async function listConsultations(params) {
  const { data } = await api.get('/consultations', { params })
  return data
}

export async function getConsultation(id) {
  const { data } = await api.get(`/consultations/${id}`)
  return data.data
}

export async function createConsultation(values) {
  const { data } = await api.post('/consultations', values)
  return data.data
}

export async function updateConsultation(id, values) {
  const { data } = await api.put(`/consultations/${id}`, values)
  return data.data
}

export async function closeConsultation(id) {
  const { data } = await api.post(`/consultations/${id}/close`)
  return data.data
}

export async function updateExam(consultationId, examId, values) {
  const { data } = await api.put(`/consultations/${consultationId}/exams/${examId}`, values)
  return data.data
}

export async function listVeterinarians() {
  const { data } = await api.get('/veterinarians')
  return data.data
}
