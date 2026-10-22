import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useCan } from '../hooks/useCan'
import { useAuthStore } from '../store/authStore'

/**
 * Exige sesión iniciada y, opcionalmente, un permiso.
 */
export default function ProtectedRoute({ permission, children }) {
  const token = useAuthStore((state) => state.token)
  const allowed = useCan(permission)
  const location = useLocation()

  if (!token) {
    return <Navigate to="/login" replace state={{ from: location }} />
  }

  if (!allowed) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-6 text-amber-800">
        No tienes permiso para acceder a este módulo.
      </div>
    )
  }

  return children ?? <Outlet />
}
