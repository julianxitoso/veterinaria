import { Link } from 'react-router-dom'

const variants = {
  primary: 'bg-brand text-white shadow-sm shadow-brand/20 hover:bg-brand-dark',
  secondary: 'border border-line-strong bg-white text-ink hover:border-stone-300 hover:bg-stone-50',
  soft: 'bg-brand-light text-brand-dark hover:bg-brand-soft',
  ghost: 'text-stone-600 hover:bg-stone-100 hover:text-ink',
  danger: 'bg-red-50 text-red-700 hover:bg-red-100',
}

const sizes = {
  sm: 'h-8 gap-1.5 px-3 text-[13px]',
  md: 'h-9 gap-2 px-3.5 text-sm',
  lg: 'h-11 gap-2 px-5 text-[15px]',
}

/**
 * Botón con variantes. Si recibe `to`, se renderiza como enlace de React Router.
 * `icon` es un componente de lucide-react que se muestra a la izquierda.
 */
export default function Button({ variant = 'primary', size = 'md', icon: Icon, to, className = '', children, ...props }) {
  const classes = `inline-flex shrink-0 items-center justify-center whitespace-nowrap rounded-lg font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/30 disabled:pointer-events-none disabled:opacity-50 ${variants[variant]} ${sizes[size]} ${className}`

  const content = (
    <>
      {Icon && <Icon className={size === 'sm' ? 'size-3.5' : 'size-4'} strokeWidth={2} aria-hidden="true" />}
      {children}
    </>
  )

  if (to) {
    return <Link to={to} className={classes} {...props}>{content}</Link>
  }

  return <button type="button" className={classes} {...props}>{content}</button>
}
