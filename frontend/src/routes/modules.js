import {
  CalendarDays,
  House,
  Package,
  PawPrint,
  Receipt,
  Settings,
  Stethoscope,
  UserCog,
  Users,
} from 'lucide-react'

/**
 * Módulos del menú lateral, agrupados por sección. `permission` controla
 * quién lo ve y quién entra; `ready: false` muestra "próximamente".
 */
export const modules = [
  { path: '/', label: 'Inicio', icon: House, section: 'Clínica', ready: true },
  { path: '/citas', label: 'Citas', icon: CalendarDays, permission: 'citas.ver', section: 'Clínica', ready: true },
  { path: '/consultas', label: 'Consultas', icon: Stethoscope, permission: 'consultas.ver', section: 'Clínica', ready: true },
  { path: '/pacientes', label: 'Pacientes', icon: PawPrint, permission: 'pacientes.ver', section: 'Clínica', ready: true },
  { path: '/clientes', label: 'Clientes', icon: Users, permission: 'pacientes.ver', section: 'Clínica', ready: true },
  { path: '/inventario', label: 'Inventario', icon: Package, permission: 'inventario.ver', section: 'Gestión', ready: true },
  { path: '/facturas', label: 'Facturación', icon: Receipt, permission: 'facturas.ver', section: 'Gestión', ready: true },
  { path: '/usuarios', label: 'Usuarios', icon: UserCog, permission: 'usuarios.ver', section: 'Administración', ready: true },
  { path: '/configuracion', label: 'Configuración', icon: Settings, permission: 'configuracion.ver', section: 'Administración', ready: true },
]
