import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import type { ReactNode } from 'react'
import { supabase, isSupabaseConfigured } from '@/lib/supabase'
import { signIn, signOut, getCurrentUser, getSession, getProfile, listProfiles } from '@/lib/db'
import type { Profile, UserRole } from '@/types'

interface AuthContextType {
  user: any | null
  profile: Profile | null
  role: UserRole | null
  session: any | null
  loading: boolean
  configured: boolean
  signIn: (email: string, password: string) => Promise<{ error: string | null }>
  signOut: () => Promise<void>
  refresh: () => Promise<void>
  isAdmin: boolean
  isStaff: boolean
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<any | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [session, setSession] = useState<any | null>(null)
  const [loading, setLoading] = useState(true)
  const configured = isSupabaseConfigured

  const refresh = useCallback(async () => {
    if (!configured) { setLoading(false); return }
    try {
      const sess = await getSession()
      setSession(sess)
      setUser(sess?.user ?? null)
      if (sess?.user) {
        const { data } = await getProfile(sess.user.id)
        setProfile(data ?? null)
      } else {
        setProfile(null)
      }
    } catch (e) {
      // Never leave the app stuck on a blank screen.
      console.error('AuthContext refresh failed:', e)
      setSession(null)
      setUser(null)
      setProfile(null)
    } finally {
      setLoading(false)
    }
  }, [configured])

  useEffect(() => {
    // Without a configured Supabase client there is nothing to listen to.
    if (!configured || !supabase) { setLoading(false); return }
    // listen to auth changes
    const { data: sub } = supabase.auth.onAuthStateChange(async (_event, sess) => {
      try {
        setSession(sess ?? null)
        setUser(sess?.user ?? null)
        if (sess?.user) {
          const { data } = await getProfile(sess.user.id)
          setProfile(data ?? null)
        } else {
          setProfile(null)
        }
      } catch (e) {
        console.error('onAuthStateChange failed:', e)
        setProfile(null)
      } finally {
        setLoading(false)
      }
    })
    return () => {
      sub?.subscription?.unsubscribe?.()
    }
  }, [configured, refresh])

  const doSignIn = async (email: string, password: string) => {
    const res = await signIn(email, password)
    await refresh()
    return { error: res.error }
  }

  const doSignOut = async () => {
    await signOut()
    setUser(null)
    setProfile(null)
    setSession(null)
    setLoading(false)
  }

  const role = profile?.role ?? null
  const isAdmin = role === 'administrator'
  const isStaff = Boolean(role)

  return (
    <AuthContext.Provider value={{ user, profile, role, session, loading, configured, signIn: doSignIn, signOut: doSignOut, refresh, isAdmin, isStaff }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
