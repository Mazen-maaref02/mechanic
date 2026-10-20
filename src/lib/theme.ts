/**
 * Gestion du thème clair / sombre.
 * - Choix persisté dans localStorage ("garagepro-theme").
 * - appliqué via la classe .dark sur <html> (cf. index.css).
 * - Un script inline dans index.html applique la classe AVANT le premier
 *   rendu pour éviter le flash de mauvais thème.
 */
import { useEffect, useState } from 'react'

export type Theme = 'light' | 'dark'

const KEY = 'garagepro-theme'
const listeners = new Set<() => void>()

export function getTheme(): Theme {
  try {
    return localStorage.getItem(KEY) === 'dark' ? 'dark' : 'light'
  } catch {
    return 'light'
  }
}

export function applyTheme(theme: Theme) {
  document.documentElement.classList.toggle('dark', theme === 'dark')
  // barre d'état / notifs du navigateur mobile
  const meta = document.querySelector('meta[name="theme-color"]')
  if (meta) meta.setAttribute('content', theme === 'dark' ? '#0b1326' : '#f7f8fa')
}

export function setTheme(theme: Theme) {
  try {
    localStorage.setItem(KEY, theme)
  } catch {
    /* stockage indisponible (mode privé) : on applique quand même */
  }
  applyTheme(theme)
  listeners.forEach((fn) => fn())
}

export function toggleTheme() {
  setTheme(getTheme() === 'dark' ? 'light' : 'dark')
}

/** Hook React : [thème, changer]] */
export function useTheme(): [Theme, (t: Theme) => void] {
  const [theme, set] = useState<Theme>(getTheme)
  useEffect(() => {
    const fn = () => set(getTheme())
    listeners.add(fn)
    return () => { listeners.delete(fn) }
  }, [])
  return [theme, setTheme]
}
