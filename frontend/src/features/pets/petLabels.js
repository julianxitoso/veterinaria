export const SPECIES = ['Perro', 'Gato', 'Ave', 'Conejo', 'Hámster', 'Cobayo', 'Hurón', 'Reptil', 'Pez', 'Equino', 'Bovino', 'Otro']

const SPECIES_ICONS = {
  perro: '🐶', gato: '🐱', ave: '🐦', conejo: '🐰', hámster: '🐹', cobayo: '🐹',
  hurón: '🦦', reptil: '🦎', pez: '🐟', equino: '🐴', bovino: '🐮',
}

export const SEXES = { male: 'Macho', female: 'Hembra', unknown: 'Sin definir' }

export function sexLabel(sex) {
  return SEXES[sex] ?? sex
}

export function speciesIcon(species) {
  return SPECIES_ICONS[species?.toLowerCase()] ?? '🐾'
}
