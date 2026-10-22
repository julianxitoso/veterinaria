import api from './api'

export async function getPetHistory(petId, params) {
  const { data } = await api.get(`/pets/${petId}/history`, { params })
  return data.data
}

export async function getClinicalSummary(petId) {
  const { data } = await api.get(`/pets/${petId}/clinical-summary`)
  return data.data
}

export async function createRecord(petId, values) {
  const { data } = await api.post(`/pets/${petId}/records`, values)
  return data.data
}

export async function archiveRecord(recordId) {
  const { data } = await api.post(`/records/${recordId}/archive`)
  return data.data
}

export async function uploadAttachment(attachableType, attachableId, file) {
  const form = new FormData()
  form.append('attachable_type', attachableType)
  form.append('attachable_id', attachableId)
  form.append('file', file)
  const { data } = await api.post('/attachments', form)
  return data.data
}

/**
 * Los adjuntos son privados: se descargan con el token y se abren como blob.
 */
export async function openAttachment(attachment) {
  const { data } = await api.get(`/attachments/${attachment.id}/download`, { responseType: 'blob' })
  const url = URL.createObjectURL(data)
  window.open(url, '_blank', 'noopener')
  setTimeout(() => URL.revokeObjectURL(url), 60_000)
}
