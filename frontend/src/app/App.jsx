import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useEffect } from 'react'
import { RouterProvider } from 'react-router-dom'
import { useTenantStore } from '../store/tenantStore'
import { router } from '../routes/router'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      refetchOnWindowFocus: false,
      // no reintentar errores del cliente (404, 403, 422…)
      retry: (count, error) => count < 2 && !(error.response?.status < 500),
    },
  },
})

export default function App() {
  const { status, load } = useTenantStore()

  useEffect(() => {
    load()
  }, [load])

  if (status === 'idle' || status === 'loading') {
    return <FullScreenMessage>Cargando…</FullScreenMessage>
  }

  if (status === 'not_found') {
    return (
      <FullScreenMessage>
        <p className="text-lg font-semibold">Clínica no encontrada</p>
        <p className="text-sm text-muted">Verifica la dirección o contacta al soporte.</p>
      </FullScreenMessage>
    )
  }

  return (
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  )
}

function FullScreenMessage({ children }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-1 text-stone-600">
      {children}
    </div>
  )
}
