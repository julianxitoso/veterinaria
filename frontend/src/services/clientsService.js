import api from './api'

export async function listClients(params) {
  const { data } = await api.get('/clients', { params })
  return data
}

export async function getClient(id) {
  const { data } = await api.get(`/clients/${id}`)
  return data.data
}

export async function createClient(values) {
  const { data } = await api.post('/clients', values)
  return data.data
}

export async function updateClient(id, values) {
  const { data } = await api.put(`/clients/${id}`, values)
  return data.data
}

export async function deleteClient(id) {
  await api.delete(`/clients/${id}`)
}
