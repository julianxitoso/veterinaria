/**
 * Obtiene el slug de la clínica desde el subdominio ({slug}.dominio-central).
 * En producción el dominio central lo inyecta Laravel (window.APP_CONFIG);
 * en desarrollo viene de VITE_CENTRAL_DOMAIN. Sin subdominio se usa
 * VITE_DEFAULT_TENANT (ej. localhost).
 */
export function resolveTenantSlug() {
  const host = window.location.hostname
  const central = window.APP_CONFIG?.centralDomain || import.meta.env.VITE_CENTRAL_DOMAIN

  if (central && host.endsWith(`.${central}`)) {
    return host.slice(0, -(central.length + 1))
  }

  return import.meta.env.VITE_DEFAULT_TENANT
}
