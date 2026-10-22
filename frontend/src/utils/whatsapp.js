/**
 * Indicativo que se antepone a los celulares guardados sin él.
 * Colombia por ahora; a futuro puede venir de la configuración de la clínica.
 */
const DEFAULT_COUNTRY_CODE = '57'

/**
 * Número en formato internacional solo con dígitos (ej. 573001234567), o null si no sirve.
 */
export function toWhatsAppNumber(phone) {
  if (!phone) return null

  const digits = String(phone).replace(/\D/g, '').replace(/^00/, '')

  // celular colombiano de 10 dígitos (3xx…) sin indicativo
  if (digits.length === 10 && digits.startsWith('3')) return DEFAULT_COUNTRY_CODE + digits
  // ya trae indicativo u otro formato internacional
  if (digits.length >= 11 && digits.length <= 15) return digits

  return null
}

/**
 * Reemplaza {variables} de una plantilla. Las que no tengan valor quedan vacías.
 */
export function fillTemplate(template, values) {
  return template
    .replace(/\{(\w+)\}/g, (_, key) => values[key] ?? '')
    // limpia restos como "en Clínica ()" cuando falta la dirección
    .replace(/\s*\(\s*\)/g, '')
}

/**
 * Enlace que abre WhatsApp (app o web) con el chat y el mensaje listos.
 */
export function whatsAppUrl(phone, text) {
  const number = toWhatsAppNumber(phone)
  return number ? `https://wa.me/${number}?text=${encodeURIComponent(text)}` : null
}
