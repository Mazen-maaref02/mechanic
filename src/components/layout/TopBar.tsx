import { useNavigate } from 'react-router-dom'
import { Menu, User, LogOut } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useT } from '@/lib/i18n'

interface TopBarProps {
  user: { full_name?: string | null; email?: string | null }
  role?: string
  onMenu?: () => void
}

export function TopBar({ user, role, onMenu }: TopBarProps) {
  const navigate = useNavigate()
  const t = useT()

  return (
    <header className="sticky top-0 z-20 flex items-center justify-between px-1 py-2 md:px-2 md:py-3 bg-white border-b border-garage-border shadow-sm">
      <div className="flex items-center gap-2 min-w-0">
        <Button variant="ghost" size="sm" onClick={onMenu} className="md:hidden" aria-label="Ouvrir le menu">
          <Menu className="w-5 h-5" />
        </Button>
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-7 h-7 rounded-lg bg-garage-orange flex items-center justify-center text-[10px] font-bold shrink-0">GP</div>
          <div className="min-w-0">
            <div className="text-sm font-semibold text-garage-text leading-tight">GaragePro</div>
            <div className="hidden sm:block text-xs text-garage-text-muted leading-tight">{t('tagline')}</div>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <span className="hidden md:block text-xs text-garage-text-muted">{user?.full_name || user?.email}</span>
        <span className="hidden lg:block text-xs text-garage-text-muted uppercase tracking-wider">{role || '—'}</span>
        <Button variant="ghost" size="sm" onClick={() => navigate('/login')} aria-label={t('logout')}>
          <User className="w-4 h-4 md:hidden" />
          <LogOut className="hidden md:block w-4 h-4" />
          <span className="hidden md:inline ml-1.5 text-xs">{t('logout')}</span>
        </Button>
      </div>
    </header>
  )
}
