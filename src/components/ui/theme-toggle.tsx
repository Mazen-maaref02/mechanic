import { Moon, Sun } from 'lucide-react'
import { useTheme, type Theme } from '@/lib/theme'

interface ThemeToggleProps {
  /* Variante compacte : bouton icône seul (topbar).
     Variante étiquetée : libellé + icône ( pied de sidebar). */
  variant?: 'icon' | 'labelled'
}

export function ThemeToggle({ variant = 'icon' }: ThemeToggleProps) {
  const [theme, setTheme] = useTheme()
  const next: Theme = theme === 'dark' ? 'light' : 'dark'
  const label = theme === 'dark' ? 'Passer en thème clair' : 'Passer en thème sombre'

  if (variant === 'labelled') {
    return (
      <button
        type="button"
        onClick={() => setTheme(next)}
        className="w-full flex items-center gap-3 px-4 py-2.5 text-sm rounded-lg text-white/80 hover:bg-white/10 hover:text-white transition-colors"
        aria-label={label}
      >
        {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        <span>{theme === 'dark' ? 'Thème clair' : 'Thème sombre'}</span>
      </button>
    )
  }

  return (
    <button
      type="button"
      onClick={() => setTheme(next)}
      className="inline-flex items-center justify-center w-9 h-9 rounded-lg text-garage-text-muted hover:bg-garage-subtle hover:text-garage-text transition-colors"
      aria-label={label}
      title={label}
    >
      {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
    </button>
  )
}
