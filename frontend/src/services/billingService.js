import api from './api'

export async function listInvoices(params) {
  const { data } = await api.get('/invoices', { params })
  return data
}

export async function getInvoice(id) {
  const { data } = await api.get(`/invoices/${id}`)
  return data.data
}

export async function createInvoice(values) {
  const { data } = await api.post('/invoices', values)
  return data.data
}

export async function updateInvoice(id, values) {
  const { data } = await api.put(`/invoices/${id}`, values)
  return data.data
}

export async function deleteInvoice(id) {
  await api.delete(`/invoices/${id}`)
}

export async function invoiceFromConsultation(consultationId) {
  const { data } = await api.post(`/consultations/${consultationId}/invoice`)
  return data.data
}

export async function issueInvoice(id, payment) {
  const { data } = await api.post(`/invoices/${id}/issue`, payment ? { payment } : {})
  return data.data
}

export async function addPayment(id, values) {
  const { data } = await api.post(`/invoices/${id}/payments`, values)
  return data.data
}

export async function voidInvoice(id, reason) {
  const { data } = await api.post(`/invoices/${id}/void`, { reason })
  return data.data
}

export async function listServices(params) {
  const { data } = await api.get('/services', { params })
  return data.data
}

export async function saveService(values) {
  const { data } = values.id ? await api.put(`/services/${values.id}`, values) : await api.post('/services', values)
  return data.data
}

export async function getBillingSettings() {
  const { data } = await api.get('/billing/settings')
  return data.data
}

export async function updateBillingSettings(values) {
  const { data } = await api.put('/billing/settings', values)
  return data.data
}
