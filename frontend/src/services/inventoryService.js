import api from './api'

export async function listProducts(params) {
  const { data } = await api.get('/products', { params })
  return data
}

export async function getProduct(id) {
  const { data } = await api.get(`/products/${id}`)
  return data.data
}

export async function createProduct(values) {
  const { data } = await api.post('/products', values)
  return data.data
}

export async function updateProduct(id, values) {
  const { data } = await api.put(`/products/${id}`, values)
  return data.data
}

export async function getProductOptions() {
  const { data } = await api.get('/products/options')
  return data.data
}

export async function getInventoryAlerts() {
  const { data } = await api.get('/products/alerts')
  return data.data
}

export async function createMovement(productId, values) {
  const { data } = await api.post(`/products/${productId}/movements`, values)
  return data.data
}

export async function listMovements(params) {
  const { data } = await api.get('/inventory/movements', { params })
  return data
}
