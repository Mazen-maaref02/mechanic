import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { Card } from '@/components/ui/card'
import { useToastMsg } from '@/components/ui/toaster'
import { getDashboardStats } from '@/lib/db'
import { useT } from '@/lib/i18n'
import { Car, Wrench, Truck, CreditCard } from 'lucide-react'

interface StatCardProps {
  title: string
  value: number | string
  icon: React.ElementType
  color: 'orange' | 'blue' | 'green' | 'amber' | 'red'
  href?: string
}

function StatCard({ title, value, icon: Icon, color, href }: StatCardProps) {
  const colors: Record<string, string> = {
    orange: 'bg-garage-orange-light text-garage-orange border-garage-orange/20',
    blue: 'bg-garage-blue-light text-garage-blue border-garage-blue/20',
    green: 'bg-garage-success-light text-garage-success border-garage-success/20',
    amber: 'bg-garage-warning-light text-garage-warning border-garage-warning/20',
    red: 'bg-garage-danger-light text-garage-danger border-garage-danger/20',
  }
  return (
    <Card className="hover:shadow-card-hover cursor-pointer" onClick={() => href && window.location.assign(href)} role="button" tabIndex={0} style={{ cursor: href ? 'pointer' : 'default' }}>
      <div className="p-3 sm:p-5">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <p className="text-[10px] sm:text-xs font-medium text-garage-text-muted uppercase tracking-wider leading-tight">{title}</p>
            <p className="text-xl sm:text-2xl font-bold text-garage-text">{value}</p>
          </div>
          <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center shrink-0 ${colors[color]}`}>
            <Icon className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
        </div>
      </div>
    </Card>
  )
}

export default function Dashboard() {
  const { user, role, profile, refresh } = useAuth()
  const toast = useToastMsg()
  const t = useT()
  const [stats, setStats] = useState<any>({
    totalCars: 0, underMaintenance: 0, awaitingDiagnosis: 0, awaitingParts: 0,
    finished: 0, delivered: 0, unpaidInvoices: 0, revenueToday: 0, revenueMonth: 0,
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    load()
  }, [refresh])

  async function load() {
    setLoading(true)
    const { data: s, error } = await getDashboardStats()
    if (error) { toast.error(error); setLoading(false); return }
    setStats(s || {
      totalCars: 0, underMaintenance: 0, awaitingDiagnosis: 0, awaitingParts: 0,
      finished: 0, delivered: 0, unpaidInvoices: 0, revenueToday: 0, revenueMonth: 0,
    })
    setLoading(false)
  }

  if (loading) return (
    <div className="main p-6 flex items-center justify-center min-h-[60vh]">
      <div className="text-garage-text-muted">{t('loading')}</div>
    </div>
  )

  return (
    <div className="main p-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-garage-text">{t('dashTitle')}</h1>
          <p className="text-garage-text-muted text-sm">{t('welcome')}</p>
        </div>
        <div className="flex items-center gap-2">
          <Link to="/register" className="btn-primary px-4 py-2.5 text-sm">
            <Car className="w-4 h-4 mr-2" /> {t('navRegister')}
          </Link>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4 mb-6">
        <StatCard title={t('dashTotalCars')} value={stats.totalCars} icon={Car} color="blue" href="/maintenance" />
        <StatCard title={t('dashUnderMaintenance')} value={stats.underMaintenance} icon={Wrench} color="orange" href="/maintenance" />
        <StatCard title={t('dashFinished')} value={stats.finished} icon={Truck} color="green" href="/finished" />
        <StatCard title={t('dashDelivered')} value={stats.delivered} icon={Truck} color="green" />
        <StatCard title={t('dashUnpaidInvoices')} value={stats.unpaidInvoices} icon={CreditCard} color="red" href="/invoices" />
      </div>
    </div>
  )
}
