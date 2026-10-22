import api from './api'

export async function listPets(params) {
  const { data } = await api.get('/pets', { params })
  return data
}

export async function getPet(id) {
  const { data } = await api.get(`/pets/${id}`)
  return data.data
}

export async function createPet(values) {
  const { data } = await api.post('/pets', values)
  return data.data
}

export async function updatePet(id, values) {
  const { data } = await api.put(`/pets/${id}`, values)
  return data.data
}

export async function uploadPetPhoto(id, file) {
  const form = new FormData()
  form.append('photo', file)
  const { data } = await api.post(`/pets/${id}/photo`, form)
  return data.data
}

export async function deletePet(id) {
  await api.delete(`/pets/${id}`)
}
