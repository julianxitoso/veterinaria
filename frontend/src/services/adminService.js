import api from './api'

export async function listUsers() {
  const { data } = await api.get('/users')
  return data.data
}

export async function saveUser(values) {
  const { data } = values.id ? await api.put(`/users/${values.id}`, values) : await api.post('/users', values)
  return data.data
}

export async function listRoles() {
  const { data } = await api.get('/roles')
  return data
}

export async function saveRole(values) {
  const { data } = values.id ? await api.put(`/roles/${values.id}`, values) : await api.post('/roles', values)
  return data.data
}

export async function getClinicSettings() {
  const { data } = await api.get('/settings/clinic')
  return data.data
}

export async function updateClinicSettings(values) {
  const { data } = await api.put('/settings/clinic', values)
  return data.data
}

export async function uploadLogo(file) {
  const form = new FormData()
  form.append('logo', file)
  const { data } = await api.post('/settings/clinic/logo', form)
  return data.data
}

export async function deleteLogo() {
  const { data } = await api.delete('/settings/clinic/logo')
  return data.data
}

export async function updateProfile(values) {
  const { data } = await api.put('/profile', values)
  return data.data
}

export async function updatePassword(values) {
  const { data } = await api.put('/profile/password', values)
  return data
}

export async function listAuditLogs(params) {
  const { data } = await api.get('/audit-logs', { params })
  return data
}
