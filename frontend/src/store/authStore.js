import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { resolveTenantSlug } from '../utils/tenant'

export const useAuthStore = create(
  persist(
    (set) => ({
      token: null,
      user: null,

      setSession: (token, user) => set({ token, user }),
      setUser: (user) => set({ user }),
      clear: () => set({ token: null, user: null }),
    }),
    // una sesión independiente por clínica
    { name: `auth:${resolveTenantSlug()}` },
  ),
)
