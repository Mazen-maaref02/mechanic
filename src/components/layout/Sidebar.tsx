import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard,
  Car,
  CarFront,
  Wrench,
  Users,
  FileText,
  Package,
  BarChart3,
  Settings,
  LogOut,
  Banknote,
} from 'lucide-react'
import { useT } from '@/lib/i18n'
import { getRevenueSummary } from '@/lib/db'
import { formatMoney } from '@/lib/currency'

interface NavItem {
  label: string
  href: string
  icon: React.ElementType
  roles?: ('administrator' | 'mechanic' | 'receptionist')[]
}

const navItems: NavItem[] = [
  { label: 'navDashboard', href: '/', icon: LayoutDashboard },
  { label: 'navRegister', href: '/register', icon: CarFront },
  { label: 'navMaintenance', href: '/maintenance', icon: Car },
  { label: 'navFinished', href: '/finished', icon: Wrench },
  { label: 'navCustomers', href: '/customers', icon: Users },
  { label: 'navInvoices', href: '/invoices', icon: FileText },
  { label: 'navSettings', href: '/settings', icon: Settings, roles: ['administrator'] },
]

function cn(...classes: (string | boolean | undefined | null)[]): string {
  return classes.filter(Boolean).join(' ')
}

interface SidebarProps {
  user: { full_name?: string | null; email?: string | null }
  role?: string
  open: boolean
  onClose: () => void
}

type IncomePeriod = 'total' | 'month' | 'week' | 'day'

const INCOME_CHOICES: { key: IncomePeriod; label: string }[] = [
  { key: 'total', label: 'Total' },
  { key: 'month', label: 'Mois' },
  { key: 'week', label: 'Semaine' },
  { key: 'day', label: "Aujourd'hui" },
]

export function Sidebar({ user, role, open, onClose }: SidebarProps) {
  const navigate = useNavigate()
  const t = useT()
  const [income, setIncome] = useState<Record<IncomePeriod, number>>({ total: 0, month: 0, week: 0, day: 0 })
  const [incomePeriod, setIncomePeriod] = useState<IncomePeriod>('total')

  const isActive = (href: string) => window.location.pathname === href
  const visibleItems = navItems.filter((item) => !item.roles || item.roles.includes(role as any))

  useEffect(() => {
    if (!user?.email) return
    let cancelled = false
    getRevenueSummary().then(({ data }) => {
      if (data && !cancelled) setIncome({ total: data.total, month: data.month, week: data.week, day: data.day })
    })
    return () => { cancelled = true }
  }, [user?.email])

  return (
    <>
      <aside
        className={cn(
          'sidebar transition-transform duration-200',
          open ? 'translate-x-0' : '-translate-x-full md:translate-x-0',
        )}
        aria-label="Navigation principale"
      >
        <div className="p-5">
          <div className="flex items-center gap-2 mb-6">
            <div className="w-8 h-8 rounded-lg bg-garage-orange flex items-center justify-center text-white font-bold text-xs">GP</div>
            <span className="font-bold text-lg tracking-tight">GaragePro</span>
          </div>
          <nav className="space-y-1">
            {visibleItems.map((item) => {
              const active = isActive(item.href)
              return (
                <button
                  key={item.href}
                  onClick={() => {
                    navigate(item.href)
                    onClose()
                  }}
                  className={cn(
                    'flex items-center gap-3 px-4 py-3 text-sm rounded-lg transition-colors w-full text-left',
                    active
                      ? 'bg-garage-orange text-white'
                      : 'text-garage-text-inverse hover:bg-garage-charcoal-light',
                  )}
                >
                  <item.icon className="w-5 h-5" />
                  <span>{t(item.label)}</span>
                </button>
              )
            })}
          </nav>

          {/* Revenus : total + périodes (mois / semaine / jour) */}
          {user?.email && (
            <div className="mt-6 px-3 py-3 rounded-xl bg-white/5 border border-white/10">
              <p className="flex items-center gap-2 text-[10px] text-gray-400 uppercase tracking-wider mb-1">
                <Banknote className="w-3.5 h-3.5" /> Revenus
              </p>
              <p className="text-lg font-bold text-white leading-tight truncate" title={formatMoney(income[incomePeriod])}>
                {formatMoney(income[incomePeriod])}
              </p>
              <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2 text-[11px]">
                {INCOME_CHOICES.map((c) => (
                  <button
                    key={c.key}
                    onClick={() => setIncomePeriod(c.key)}
                    aria-pressed={incomePeriod === c.key}
                    className={cn(
                      'transition-colors',
                      incomePeriod === c.key
                        ? 'text-garage-orange font-semibold underline underline-offset-2'
                        : 'text-gray-400 hover:text-white',
                    )}
                  >
                    {c.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
        <div className="mt-auto p-5 border-t border-white/10">
          <div className="mb-3">
            <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Compte</p>
            <p className="text-sm text-white truncate">{user?.full_name || user?.email || 'Utilisateur'}</p>
            <p className="text-xs text-gray-500 truncate">{role || '—'}</p>
          </div>
          <button
            onClick={() => navigate('/login')}
            className="w-full flex items-center gap-3 px-4 py-3 text-sm rounded-lg text-garage-text-inverse hover:bg-garage-charcoal-light transition-colors border border-white/10 bg-white/5"
          >
            <LogOut className="w-4 h-4" />
            <span>{t('logout')}</span>
          </button>
        </div>
      </aside>

      {/* Overlay behind the drawer on phones */}
      <div
        className={cn(
          'fixed inset-0 bg-black/40 z-30 md:hidden transition-opacity duration-200',
          open ? 'opacity-100' : 'opacity-0 pointer-events-none',
        )}
        onClick={onClose}
        aria-hidden="true"
      />
    </>
  )
}
