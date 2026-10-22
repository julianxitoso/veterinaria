import { createBrowserRouter, Navigate } from 'react-router-dom'
import AppLayout from '../components/layout/AppLayout'
import RolesPage from '../features/admin/RolesPage'
import AgendaPage from '../features/appointments/AgendaPage'
import SchedulesPage from '../features/appointments/SchedulesPage'
import PublicBookingPage from '../features/booking/PublicBookingPage'
import UsersPage from '../features/admin/UsersPage'
import LoginPage from '../features/auth/LoginPage'
import AuditLogPage from '../features/settings/AuditLogPage'
import ClinicSettingsPage from '../features/settings/ClinicSettingsPage'
import ProfilePage from '../features/settings/ProfilePage'
import BillingSettingsPage from '../features/billing/BillingSettingsPage'
import InvoiceDetailPage from '../features/billing/InvoiceDetailPage'
import InvoiceEditorPage from '../features/billing/InvoiceEditorPage'
import InvoicesListPage from '../features/billing/InvoicesListPage'
import ServicesPage from '../features/billing/ServicesPage'
import MovementsPage from '../features/inventory/MovementsPage'
import ProductDetailPage from '../features/inventory/ProductDetailPage'
import ProductFormPage from '../features/inventory/ProductFormPage'
import ProductsListPage from '../features/inventory/ProductsListPage'
import ClientDetailPage from '../features/clients/ClientDetailPage'
import ClientFormPage from '../features/clients/ClientFormPage'
import ClientsListPage from '../features/clients/ClientsListPage'
import ConsultationDetailPage from '../features/consultations/ConsultationDetailPage'
import ConsultationFormPage from '../features/consultations/ConsultationFormPage'
import ConsultationsListPage from '../features/consultations/ConsultationsListPage'
import PetDetailPage from '../features/pets/PetDetailPage'
import PetFormPage from '../features/pets/PetFormPage'
import PetsListPage from '../features/pets/PetsListPage'
import ComingSoonPage from '../pages/ComingSoonPage'
import DashboardPage from '../pages/DashboardPage'
import { modules } from './modules'
import ProtectedRoute from './ProtectedRoute'

/**
 * Ruta que exige un permiso concreto.
 */
const guarded = (permission, element) => <ProtectedRoute permission={permission}>{element}</ProtectedRoute>

export const router = createBrowserRouter([
  { path: '/login', element: <LoginPage /> },
  // agenda pública para clientes: no requiere sesión
  { path: '/agendar', element: <PublicBookingPage /> },
  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <AppLayout />,
        children: [
          { index: true, element: <DashboardPage /> },

          { path: 'clientes', element: guarded('pacientes.ver', <ClientsListPage />) },
          { path: 'clientes/nuevo', element: guarded('pacientes.crear', <ClientFormPage />) },
          { path: 'clientes/:id', element: guarded('pacientes.ver', <ClientDetailPage />) },
          { path: 'clientes/:id/editar', element: guarded('pacientes.editar', <ClientFormPage />) },

          { path: 'pacientes', element: guarded('pacientes.ver', <PetsListPage />) },
          { path: 'pacientes/nuevo', element: guarded('pacientes.crear', <PetFormPage />) },
          { path: 'pacientes/:id', element: guarded('pacientes.ver', <PetDetailPage />) },
          { path: 'pacientes/:id/editar', element: guarded('pacientes.editar', <PetFormPage />) },

          { path: 'consultas', element: guarded('consultas.ver', <ConsultationsListPage />) },
          { path: 'consultas/nueva', element: guarded('consultas.crear', <ConsultationFormPage />) },
          { path: 'consultas/:id', element: guarded('consultas.ver', <ConsultationDetailPage />) },
          { path: 'consultas/:id/editar', element: guarded('consultas.editar', <ConsultationFormPage />) },

          { path: 'inventario', element: guarded('inventario.ver', <ProductsListPage />) },
          { path: 'inventario/nuevo', element: guarded('inventario.crear', <ProductFormPage />) },
          { path: 'inventario/movimientos', element: guarded('inventario.ver', <MovementsPage />) },
          { path: 'inventario/:id', element: guarded('inventario.ver', <ProductDetailPage />) },
          { path: 'inventario/:id/editar', element: guarded('inventario.editar', <ProductFormPage />) },

          { path: 'facturas', element: guarded('facturas.ver', <InvoicesListPage />) },
          { path: 'facturas/nueva', element: guarded('facturas.crear', <InvoiceEditorPage />) },
          { path: 'facturas/servicios', element: guarded('facturas.ver', <ServicesPage />) },
          { path: 'facturas/configuracion', element: <Navigate to="/configuracion/facturacion" replace /> },
          { path: 'facturas/:id', element: guarded('facturas.ver', <InvoiceDetailPage />) },
          { path: 'facturas/:id/editar', element: guarded('facturas.crear', <InvoiceEditorPage />) },

          { path: 'citas', element: guarded('citas.ver', <AgendaPage />) },
          { path: 'citas/horarios', element: guarded('citas.ver', <SchedulesPage />) },

          { path: 'usuarios', element: guarded('usuarios.ver', <UsersPage />) },
          { path: 'usuarios/roles', element: guarded('usuarios.ver', <RolesPage />) },

          { path: 'configuracion', element: guarded('configuracion.ver', <ClinicSettingsPage />) },
          { path: 'configuracion/facturacion', element: guarded('configuracion.ver', <BillingSettingsPage />) },
          { path: 'configuracion/auditoria', element: guarded('configuracion.editar', <AuditLogPage />) },

          { path: 'perfil', element: <ProfilePage /> },

          // módulos aún sin construir
          ...modules
            .filter((m) => !m.ready)
            .map((m) => ({ path: m.path, element: guarded(m.permission, <ComingSoonPage title={m.label} />) })),
        ],
      },
    ],
  },
  { path: '*', element: <Navigate to="/" replace /> },
])
