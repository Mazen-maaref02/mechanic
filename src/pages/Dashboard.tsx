import { useEffect, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { Card, CardHeader, CardTitle, CardSubtitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useToastMsg } from '@/components/ui/toaster'
import {
  getDashboardStats, getJobs, getProfile, getRevenueTimeline,
  statusLabel, isMaintenanceStatus,
} from '@/lib/db'
import { formatMoney, formatDateTime } from '@/lib/currency'
import { useT } from '@/lib/i18n'
import { Car, Wrench, Clock, Truck, CreditCard, ArrowUpRight, Activity, Package } from 'lucide-react'

function cn(...classes: (string | boolean | undefined | null)[]): string {
  return classes.filter(Boolean).join(' ')
}

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
  const navigate = useNavigate()
  const toast = useToastMsg()
  const t = useT()
  const [stats, setStats] = useState<any>({
    totalCars: 0, underMaintenance: 0, awaitingDiagnosis: 0, awaitingParts: 0,
    finished: 0, delivered: 0, unpaidInvoices: 0, revenueToday: 0, revenueMonth: 0,
  })
  const [recent, setRecent] = useState<any[]>([])
  const [timeline, setTimeline] = useState<{ date: string; amount: number }[]>([])
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

    // Recent activity = latest status history + newest jobs
    const { data: jobs } = await getJobs({ sortBy: 'entry_date', sortDir: 'desc' })
    const latest = (jobs || []).slice(0, 6).map((j: any) => ({
      id: j.id,
      type: 'job',
      title: `Véhicule enregistré — ${j.vehicle_brand || ''} ${j.vehicle_model || ''}`,
      subtitle: `${t('maintJobNumber')}: ${j.job_number} · ${j.customer_name || ''}`,
      time: formatDateTime(j.created_at),
      status: j.status,
      href: `/job/${j.id}`,
    }))
    setRecent(latest)

    // Revenue timeline (last 14 days) and period total for the graph
    const { data: tl, error: tlError } = await getRevenueTimeline(14)
    if (tlError) { toast.error(tlError) }
    setTimeline(tl || [])

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
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4 mb-8">
        <StatCard title={t('dashTotalCars')} value={stats.totalCars} icon={Car} color="blue" href="/maintenance" />
        <StatCard title={t('dashUnderMaintenance')} value={stats.underMaintenance} icon={Wrench} color="orange" href="/maintenance" />
        <StatCard title={t('dashFinished')} value={stats.finished} icon={Truck} color="green" href="/finished" />
        <StatCard title={t('dashDelivered')} value={stats.delivered} icon={Truck} color="green" />
        <StatCard title={t('dashUnpaidInvoices')} value={stats.unpaidInvoices} icon={CreditCard} color="red" href="/invoices" />
      </div>

      {/* Single Revenus section: graph + total + one shared history */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <ArrowUpRight className="w-4 h-4" /> Revenus
          </CardTitle>
          <CardSubtitle>Paiements encaissés — 14 derniers jours</CardSubtitle>
        </CardHeader>
        <div className="p-4 grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Graph column */}
          <div className="lg:col-span-2">
            <div className="text-xs text-garage-text-muted mb-2">
              Total sur la période : <span className="font-bold text-garage-text">{formatMoney(timeline.reduce((s, d) => s + d.amount, 0))}</span>
            </div>
            <div className="flex items-end gap-1 h-40 border-b border-garage-border pb-1">
              {timeline.map((d) => {
                const max = Math.max(...timeline.map((x) => x.amount), 1)
                const h = Math.round((d.amount / max) * 100)
                return (
                  <div
                    key={d.date}
                    className="flex-1 flex flex-col items-center justify-end h-full cursor-default"
                    title={`${d.date} — ${formatMoney(d.amount)}`}
                  >
                    <div
                      className="w-full bg-garage-orange/70 hover:bg-garage-orange rounded-t transition-colors"
                      style={{ height: `${h}%`, minHeight: '2px' }}
                    />
                  </div>
                )
              })}
            </div>
            <div className="flex gap-1 mt-1">
              {timeline.map((d) => (
                <div key={d.date} className="flex-1 text-center text-[10px] text-garage-text-muted">
                  {d.date.slice(8)}/{d.date.slice(5, 7)}
                </div>
              ))}
            </div>
          </div>

          {/* Single history column */}
          <div className="lg:col-span-1 lg:border-l lg:border-garage-border lg:pl-6">
            <div className="text-xs font-semibold uppercase tracking-wider text-garage-text-muted mb-3">Historique</div>
            {recent.length ? (
              recent.map((item) => (
                <div key={item.id} className="flex items-start gap-3 px-3 py-2 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors" onClick={() => item.href && navigate(item.href)}>
                  <div className="w-2 h-2 rounded-full mt-2 bg-garage-orange shrink-0" />
                  <div className="text-sm text-garage-text leading-snug">
                    <div className="font-medium">{item.title}</div>
                    <div className="text-xs text-garage-text-muted">{item.subtitle}</div>
                    <div className="text-xs text-garage-text-muted mt-0.5">{item.time}</div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-garage-text-muted text-sm">{t('dashNoActivity')}</div>
            )}
          </div>
        </div>
      </Card>
    </div>
  )
}
