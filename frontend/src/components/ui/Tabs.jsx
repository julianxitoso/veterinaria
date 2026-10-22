import { NavLink } from 'react-router-dom'

/**
 * Pestañas de navegación entre páginas hermanas. `tabs`: [{ to, label, icon?, end? }]
 */
export default function Tabs({ tabs }) {
  return (
    <nav className="mb-6 inline-flex max-w-full gap-1 overflow-x-auto rounded-xl bg-stone-100/80 p-1">
      {tabs.map(({ to, label, icon: Icon, end }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          className={({ isActive }) =>
            `inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-1.5 text-[13px] font-medium transition ${
              isActive ? 'bg-white text-ink shadow-card' : 'text-muted hover:text-ink'
            }`
          }
        >
          {Icon && <Icon className="size-3.5" />}
          {label}
        </NavLink>
      ))}
    </nav>
  )
}
