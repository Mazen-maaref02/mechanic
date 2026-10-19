import { useState } from 'react'
import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { Card, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { useToastMsg } from '@/components/ui/toaster'
import { AlertCircle, Lock } from 'lucide-react'
import { useT } from '@/lib/i18n'

/**
 * Page de connexion — compte administrateur unique.
 * Les inscriptions sont désactivées : le compte se gère depuis la base
 * de données (voir README, section « Compte administrateur »).
 */
export default function Login() {
  const navigate = useNavigate()
  const { signIn, configured, isStaff } = useAuth()
  const toast = useToastMsg()
  const t = useT()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (configured && isStaff) navigate('/', { replace: true })
  }, [configured, isStaff, navigate])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const res = await signIn(email.trim(), password)
    setLoading(false)
    if (res.error) {
      toast.error(res.error || t('error'))
      return
    }
    navigate('/', { replace: true })
  }

  if (!configured) {
    return (
      <div className="main flex items-center justify-center text-center p-6">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>{t('notConfigured')}</CardTitle>
          </CardHeader>
          <div className="p-6 text-garage-text-muted text-sm">{t('configureMessage')}</div>
        </Card>
      </div>
    )
  }

  return (
    <div className="main flex items-center justify-center min-h-[calc(100vh-64px)] p-6">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-2">
            <div className="w-12 h-12 rounded-xl bg-garage-orange/10 flex items-center justify-center">
              <Lock className="w-6 h-6 text-garage-orange" />
            </div>
          </div>
          <CardTitle className="text-2xl">{t('loginTitle')}</CardTitle>
          <p className="text-garage-text-muted text-sm">{t('loginSubtitle')}</p>
        </CardHeader>
        <div className="p-6 space-y-4">
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input label={t('loginEmail')} type="email" placeholder="exemple@garage.tn" value={email} onChange={(e) => setEmail(e.target.value)} required />
            <Input label={t('loginPassword')} type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
            <Button variant="primary" className="w-full" disabled={loading}>
              {loading ? t('saving') : t('loginButton')}
            </Button>
          </form>
          <p className="text-xs text-center text-garage-text-muted">
            Compte administrateur unique. Les modifications d'identifiants se font depuis la base de données.
          </p>
        </div>
        {!configured && (
          <div className="p-4 border border-garage-border rounded-lg bg-garage-orange-light text-garage-orange text-xs flex items-start gap-2">
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
            <span>{t('configureMessage')}</span>
          </div>
        )}
      </Card>
    </div>
  )
}
