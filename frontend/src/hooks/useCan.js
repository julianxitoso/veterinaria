import { useAuthStore } from '../store/authStore'

/**
 * Indica si el usuario actual tiene un permiso (ej. 'pacientes.crear').
 */
export function useCan(permission) {
  const user = useAuthStore((state) => state.user)
  return !permission || Boolean(user?.permissions?.includes(permission))
}
