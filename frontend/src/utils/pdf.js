import api from '../services/api'

/**
 * Los PDF requieren el token: se descargan como blob y se abren en otra pestaña.
 * La pestaña se abre antes de la petición para que el navegador no la bloquee.
 */
export async function openPdf(path) {
  const tab = window.open('', '_blank')

  try {
    const { data } = await api.get(path, { responseType: 'blob' })
    const url = URL.createObjectURL(new Blob([data], { type: 'application/pdf' }))
    if (tab) tab.location.href = url
    else window.location.href = url
    setTimeout(() => URL.revokeObjectURL(url), 60_000)
  } catch (error) {
    tab?.close()
    alert('No se pudo generar el documento.')
    throw error
  }
}
