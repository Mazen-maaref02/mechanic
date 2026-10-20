import { useLocation, useNavigate } from 'react-router-dom'
import { LayoutDashboard, CarFront, Car } from 'lucide-react'

/* Bottom tab bar shown on phones only (hidden from md up). */
export function BottomNav() {
  const { pathname } = useLocation()
  const navigate = useNavigate()

  const tabs: { label: string; href: string; icon: React.ElementType; exact?: boolean }[] = [
    { label: "Accueil", href: '/', icon: LayoutDashboard, exact: true },
    { label: "Réception", href: '/register', icon: CarFront },
    { label: "Garage", href: '/maintenance', icon: Car },
  ]

  const inJobDetail = pathname.startsWith('/job/')

  return (
    <nav className="bottom-nav" aria-label="Navigation mobile">
      {tabs.map((tab) => {
        const active = tab.exact ? pathname === tab.href : pathname.startsWith(tab.href)
        const Icon = tab.icon
        const isActive = active || (tab.href === '/maintenance' && inJobDetail)
        return (
          <button
            key={tab.href}
            onClick={() => navigate(tab.href)}
            className={
              'flex flex-col items-center justify-center gap-0.5 flex-1 py-2 text-[10px] font-medium transition-colors min-h-[52px]' +
              (isActive ? ' text-garage-orange' : ' text-garage-text-muted active:text-garage-orange')
            }
            aria-current={isActive ? 'page' : undefined}
          >
            <Icon className="w-5 h-5" />
            <span className="truncate max-w-full px-0.5">{tab.label}</span>
          </button>
        )
      })}
    </nav>
  )
}
