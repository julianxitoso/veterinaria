import { Building2, Receipt, ScrollText, ShieldCheck, Users } from 'lucide-react'

export const ADMIN_TABS = [
  { to: '/usuarios', label: 'Usuarios', icon: Users, end: true },
  { to: '/usuarios/roles', label: 'Roles y permisos', icon: ShieldCheck },
]

/**
 * Pestañas de configuración; `permission` oculta las que el usuario no puede ver.
 */
export const SETTINGS_TABS = [
  { to: '/configuracion', label: 'Clínica', icon: Building2, end: true },
  { to: '/configuracion/facturacion', label: 'Facturación', icon: Receipt },
  { to: '/configuracion/auditoria', label: 'Auditoría', icon: ScrollText, permission: 'configuracion.editar' },
]

/**
 * Nombres legibles de los módulos y acciones de permisos.
 */
export const MODULE_LABELS = {
  pacientes: 'Pacientes y clientes',
  consultas: 'Consultas e historia clínica',
  citas: 'Citas',
  inventario: 'Inventario',
  facturas: 'Facturación',
  configuracion: 'Configuración',
  usuarios: 'Usuarios y roles',
}

export const ACTION_LABELS = {
  ver: 'Ver',
  crear: 'Crear',
  editar: 'Editar',
  eliminar: 'Eliminar',
  'mover-stock': 'Mover stock',
  cerrar: 'Anular',
}

/**
 * Grupos del filtro de auditoría (prefijo de la acción) y etiquetas por acción.
 */
export const AUDIT_GROUPS = {
  auth: 'Ingresos y contraseñas',
  invoice: 'Facturación',
  inventory: 'Inventario',
  product: 'Productos',
  consultation: 'Consultas',
  clinical_record: 'Historia clínica',
  user: 'Usuarios',
  role: 'Roles',
  settings: 'Configuración',
  pet: 'Mascotas',
  client: 'Clientes',
}

export const AUDIT_ACTIONS = {
  'auth.login': { label: 'Ingreso', icon: '🔑' },
  'auth.failed': { label: 'Ingreso fallido', icon: '⛔' },
  'auth.password_changed': { label: 'Cambio de contraseña', icon: '🔒' },
  'invoice.issued': { label: 'Factura emitida', icon: '🧾' },
  'invoice.payment': { label: 'Pago registrado', icon: '💵' },
  'invoice.voided': { label: 'Factura anulada', icon: '❌' },
  'inventory.exit': { label: 'Salida de inventario', icon: '⬆️' },
  'inventory.adjustment': { label: 'Ajuste de inventario', icon: '⚖️' },
  'product.updated': { label: 'Producto modificado', icon: '📦' },
  'consultation.closed': { label: 'Consulta finalizada', icon: '🩺' },
  'clinical_record.archived': { label: 'Registro archivado', icon: '🗄️' },
  'user.created': { label: 'Usuario creado', icon: '👤' },
  'user.updated': { label: 'Usuario modificado', icon: '👤' },
  'role.created': { label: 'Rol creado', icon: '🛡️' },
  'role.updated': { label: 'Permisos modificados', icon: '🛡️' },
  'settings.clinic': { label: 'Datos de la clínica', icon: '⚙️' },
  'settings.logo': { label: 'Logo', icon: '🖼️' },
  'settings.billing': { label: 'Configuración de facturación', icon: '⚙️' },
  'pet.deleted': { label: 'Mascota eliminada', icon: '🗑️' },
  'client.deleted': { label: 'Cliente eliminado', icon: '🗑️' },
}

export const FIELD_LABELS = {
  name: 'Nombre',
  email: 'Email',
  is_active: 'Activo',
  price: 'Precio',
  cost: 'Costo',
  tax_rate: 'IVA',
  stock: 'Stock',
  legal_name: 'Razón social',
  tax_id: 'NIT',
  address: 'Dirección',
  phone: 'Teléfono',
  color: 'Color',
  prefix: 'Prefijo',
  next_number: 'Consecutivo',
  footer: 'Pie de página',
}
