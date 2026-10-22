import { speciesIcon } from './petLabels'

const sizes = { md: 'h-11 w-11 text-xl', lg: 'h-24 w-24 text-5xl' }

export default function PetAvatar({ pet, size = 'md' }) {
  if (pet.photo_url) {
    return <img src={pet.photo_url} alt={pet.name} className={`${sizes[size]} shrink-0 rounded-full object-cover`} />
  }

  return (
    <span className={`${sizes[size]} flex shrink-0 items-center justify-center rounded-full bg-brand-light`}>
      {speciesIcon(pet.species)}
    </span>
  )
}
