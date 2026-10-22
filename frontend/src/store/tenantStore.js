import { create } from 'zustand'
import api from '../services/api'

function applyBranding(tenant) {
  document.documentElement.style.setProperty('--brand', tenant.primary_color)
  document.title = tenant.name
}

export const useTenantStore = create((set) => ({
  tenant: null,
  status: 'idle', // idle | loading | ready | not_found

  load: async () => {
    set({ status: 'loading' })

    try {
      const { data } = await api.get('/tenant')
      applyBranding(data.data)
      set({ tenant: data.data, status: 'ready' })
    } catch {
      set({ tenant: null, status: 'not_found' })
    }
  },

  /**
   * Actualiza nombre, logo o color sin recargar (tras guardar la configuración).
   */
  update: (changes) =>
    set((state) => {
      const tenant = { ...state.tenant, ...changes }
      applyBranding(tenant)
      return { tenant }
    }),
}))
