import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { Sidebar } from './Sidebar'
import { TopBar } from './TopBar'
import { BottomNav } from './BottomNav'

export function Layout() {
  const { user, role } = useAuth()
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar
        user={user || {}}
        role={role ?? undefined}
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
      />
      <div className="flex flex-col flex-1 overflow-hidden pt-3 px-3 pb-24 md:pb-10 md:px-6 md:pt-6 md:ml-64">
        <TopBar user={user || {}} role={role ?? undefined} onMenu={() => setMenuOpen(true)} />
        <main className="flex-1 overflow-y-auto overflow-x-hidden bg-garage-bg">
          <Outlet />
        </main>
      </div>
      <BottomNav />
    </div>
  )
}
