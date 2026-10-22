import axios from 'axios'
import { useAuthStore } from '../store/authStore'
import { resolveTenantSlug } from '../utils/tenant'

const api = axios.create({
  baseURL: '/api',
  headers: { Accept: 'application/json' },
})

api.interceptors.request.use((config) => {
  config.headers['X-Tenant'] = resolveTenantSlug()

  const token = useAuthStore.getState().token
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }

  return config
})

api.interceptors.response.use(
  (response) => response,
  (error) => {
    // token vencido o inválido: se cierra la sesión local
    if (error.response?.status === 401) {
      useAuthStore.getState().clear()
    }
    return Promise.reject(error)
  },
)

export default api
