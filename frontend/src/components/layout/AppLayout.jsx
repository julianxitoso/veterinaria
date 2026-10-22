import { LogOut, Menu, PawPrint, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { modules } from '../../routes/modules'
import { fetchMe, logout } from '../../services/authService'
import { useAuthStore } from '../../store/authStore'
import { useTenantStore } from '../../store/tenantStore'

export default function AppLayout() {
  const tenant = useTenantStore((state) => state.tenant)
  const { user, setUser, clear } = useAuthStore()
  const [menuOpen, setMenuOpen] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()

  // refresca roles y permisos al entrar (pudieron cambiar desde otra sesión)
  useEffect(() => {
    fetchMe().then(setUser).catch(() => {})
  }, [setUser])

  // al navegar en el celular se cierra el menú
  const [lastPath, setLastPath] = useState(location.pathname)
  if (lastPath !== location.pathname) {
    setLastPath(location.pathname)
    setMenuOpen(false)
  }

  const visible = modules.filter((m) => !m.permission || user?.permissions?.includes(m.permission))
  const sections = [...new Set(visible.map((m) => m.section))]

  const handleLogout = async () => {
    try {
      await logout()
    } finally {
      clear()
      navigate('/login', { replace: true })
    }
  }

  const initials = (user?.name ?? '?').split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase()

  return (
    <div className="flex min-h-screen">
      <aside
        className={`fixed inset-y-0 left-0 z-30 flex w-64 flex-col border-r border-line bg-[#fbfbfa] transition-transform duration-200 md:sticky md:top-0 md:h-screen md:translate-x-0 ${
          menuOpen ? 'translate-x-0 shadow-pop' : '-translate-x-full'
        }`}
      >
        <div className="flex h-16 items-center gap-2.5 px-5">
          {tenant.logo_url ? (
            <img src={tenant.logo_url} alt="" className="size-8 shrink-0 rounded-lg object-contain" />
          ) : (
            <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-brand text-white">
              <PawPrint className="size-4" />
            </span>
          )}
          <span className="truncate text-[15px] font-semibold tracking-tight">{tenant.name}</span>
          <button className="ml-auto rounded-lg p-1.5 text-stone-400 hover:bg-stone-100 md:hidden" onClick={() => setMenuOpen(false)} aria-label="Cerrar menú">
            <X className="size-4" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 pb-4">
          {sections.map((section) => (
            <div key={section} className="mt-4 first:mt-1">
              <p className="mb-1 px-3 text-[11px] font-medium uppercase tracking-wider text-stone-400">{section}</p>
              {visible
                .filter((m) => m.section === section)
                .map(({ path, label, icon: Icon }) => (
                  <NavLink
                    key={path}
                    to={path}
                    end={path === '/'}
                    className={({ isActive }) =>
                      `group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition ${
                        isActive ? 'bg-white text-ink shadow-card ring-1 ring-line' : 'text-stone-600 hover:bg-stone-100/80 hover:text-ink'
                      }`
                    }
                  >
                    {({ isActive }) => (
                      <>
                        <Icon className={`size-[18px] ${isActive ? 'text-brand' : 'text-stone-400 group-hover:text-stone-600'}`} strokeWidth={1.75} />
                        {label}
                      </>
                    )}
                  </NavLink>
                ))}
            </div>
          ))}
        </nav>

        {/* usuario y salida */}
        <div className="border-t border-line p-3">
          <div className="flex items-center gap-3 rounded-lg px-2 py-1.5">
            <Link to="/perfil" className="flex min-w-0 flex-1 items-center gap-3 rounded-lg transition hover:opacity-80" title="Mi perfil">
              <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-brand-soft text-xs font-semibold text-brand-dark">
                {initials}
              </span>
              <span className="min-w-0">
                <span className="block truncate text-[13px] font-medium text-ink">{user?.name}</span>
                <span className="block truncate text-xs capitalize text-muted">{user?.roles?.join(', ')}</span>
              </span>
            </Link>
            <button
              onClick={handleLogout}
              className="rounded-lg p-2 text-stone-400 transition hover:bg-stone-100 hover:text-ink"
              title="Cerrar sesión"
              aria-label="Cerrar sesión"
            >
              <LogOut className="size-4" />
            </button>
          </div>
        </div>
      </aside>

      {menuOpen && <div className="fixed inset-0 z-20 animate-fade-in bg-stone-900/20 md:hidden" onClick={() => setMenuOpen(false)} />}

      <div className="flex min-w-0 flex-1 flex-col">
        {/* barra superior solo en celular */}
        <header className="sticky top-0 z-10 flex h-14 items-center gap-3 border-b border-line bg-canvas/90 px-4 backdrop-blur md:hidden">
          <button className="rounded-lg p-2 text-stone-600 hover:bg-stone-100" onClick={() => setMenuOpen(true)} aria-label="Abrir menú">
            <Menu className="size-5" />
          </button>
          <span className="truncate font-semibold">{tenant.name}</span>
        </header>

        <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 md:px-10 md:py-9">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
