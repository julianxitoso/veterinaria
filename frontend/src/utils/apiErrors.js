/**
 * Pasa los errores de validación de Laravel (422) a react-hook-form.
 * Los errores que no corresponden a un campo se muestran en `root`.
 */
export function applyServerErrors(error, setError) {
  const errors = error.response?.data?.errors

  if (error.response?.status === 422 && errors) {
    Object.entries(errors).forEach(([field, messages]) => {
      setError(field, { type: 'server', message: messages[0] })
    })
    return
  }

  setError('root', {
    message: error.response?.data?.message ?? 'No se pudo guardar. Intenta de nuevo.',
  })
}

/**
 * Convierte '' en null para que Laravel guarde campos opcionales vacíos como NULL.
 */
export function emptyToNull(values) {
  return Object.fromEntries(Object.entries(values).map(([k, v]) => [k, v === '' ? null : v]))
}
