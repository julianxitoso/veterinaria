import { Activity, Bandage, Bug, FlaskConical, StickyNote, Syringe } from 'lucide-react'

export const CONSULTATION_STATUS = {
  open: { label: 'En curso', className: 'bg-amber-50 text-amber-700' },
  closed: { label: 'Finalizada', className: 'bg-stone-100 text-stone-600' },
}

export const EXAM_STATUS = {
  requested: { label: 'Solicitado', className: 'bg-sky-50 text-sky-700' },
  completed: { label: 'Con resultado', className: 'bg-emerald-50 text-emerald-700' },
}

// `icon` (emoji) para textos cortos; `Icon` (lucide) para botones y la línea de tiempo
export const RECORD_TYPES = {
  evolution: { label: 'Evolución', icon: '📈', Icon: Activity },
  vaccine: { label: 'Vacuna', icon: '💉', Icon: Syringe, action: 'Vacuna', titleLabel: 'Vacuna aplicada', titlePlaceholder: 'Ej. Antirrábica' },
  deworming: { label: 'Desparasitación', icon: '🪱', Icon: Bug, action: 'Desparasitar', titleLabel: 'Producto', titlePlaceholder: 'Ej. Drontal Plus' },
  procedure: { label: 'Procedimiento', icon: '🩹', Icon: Bandage, action: 'Procedimiento', titleLabel: 'Procedimiento', titlePlaceholder: 'Ej. Limpieza dental' },
  exam_result: { label: 'Resultado de examen', icon: '🧪', Icon: FlaskConical },
  note: { label: 'Nota', icon: '📝', Icon: StickyNote, action: 'Nota', titleLabel: 'Título', titlePlaceholder: 'Opcional' },
}

/**
 * Acciones rápidas de la ficha de la mascota (registros sin consulta completa).
 */
export const QUICK_ACTIONS = ['vaccine', 'deworming', 'procedure', 'note']

/**
 * Tipos de registro que llevan próxima dosis.
 */
export const WITH_NEXT_DATE = ['vaccine', 'deworming']

/**
 * Filtros de la línea de tiempo de la historia clínica.
 */
export const TIMELINE_FILTERS = {
  all: { label: 'Todo' },
  consultation: { label: 'Consultas' },
  immunization: { label: 'Vacunas y desparasitación', types: ['vaccine', 'deworming'] },
  procedure: { label: 'Procedimientos', types: ['procedure'] },
  note: { label: 'Notas y resultados', types: ['note', 'exam_result', 'evolution'] },
}

export const ROUTES = ['Oral', 'Subcutánea (SC)', 'Intramuscular (IM)', 'Intravenosa (IV)', 'Tópica', 'Oftálmica', 'Ótica']
