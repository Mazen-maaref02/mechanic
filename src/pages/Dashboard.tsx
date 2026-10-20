import { useEffect, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { Card, CardHeader, CardTitle, CardSubtitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useToastMsg } from '@/components/ui/toaster'
import {
  getDashboardStats, getJobs, getProfile, getRevenueDetails,
  statusLabel, isMaintenanceStatus,
} from '@/lib/db'
import { formatMoney, formatDateTime } from '@/lib/currency'
import { useT } from '@/lib/i18n'
import { Car, Wrench, Clock, Truck, CreditCard, ArrowUpRight, Activity, Package } from 'lucide-react'

function cn(...classes: (string | boolean | undefined | null)[]): string {
  return classes.filter(Boolean).join(' ')
}

function fmtDayTime(iso: string) {
  const d = new Date(iso)
  const p = (n: number) => String(n).padStart(2, '0')
  return `${p(d.getDate())}/${p(d.getMonth() + 1)} · ${p(d.getHours())}:${p(d.getMinutes())}`
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
  const [revenue, setRevenue] = useState<any>(null)
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

    // Encaissements réels : mini grand-livre (jour / semaine / derniers paiements)
    const { data: rev, error: revError } = await getRevenueDetails()
    if (revError) { toast.error(revError) }
    setRevenue(rev)

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
          <CardSubtitle>Paiements encaissés — données réelles, ce mois-ci</CardSubtitle>
        </CardHeader>
        <div className="p-4 grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Grand-livre : encaissement du jour + derniers paiements réels */}
          <div className="lg:col-span-2">
            <div className="flex items-end justify-between gap-3 flex-wrap mb-4">
              <div className="border-l-4 border-garage-orange pl-3">
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-garage-text-muted">
                  Encaissé aujourd'hui
                </p>
                <p className="mt-0.5 text-2xl sm:text-3xl font-bold tracking-tight text-garage-text tabular-nums leading-none">
                  {formatMoney(revenue?.day?.total ?? 0)}
                </p>
              </div>
              <Link to="/revenue" className="text-xs text-garage-blue hover:underline underline-offset-2">
                Voir le détail des revenus →
              </Link>
            </div>

            <div className="border border-garage-border rounded-lg overflow-hidden">
              {/* En-tête de colonnes */}
              <div className="grid grid-cols-[auto_1fr_auto] gap-x-3 px-3 py-2 border-b border-garage-border text-[10px] font-semibold uppercase tracking-[0.12em] text-garage-text-muted">
                <span>Date</span>
                <span>Véhicule</span>
                <span className="text-right">Montant</span>
              </div>
              {/* Derniers encaissements (du mois, réels) */}
              {(revenue?.month?.payments ?? []).slice(0, 5).length ? (
                <div className="divide-y divide-garage-border">
                  {revenue.month.payments.slice(0, 5).map((p: any) => (
                    <Link
                      key={p.id}
                      to={p.jobId ? `/job/${p.jobId}` : '#'}
                      onClick={(e) => !p.jobId && e.preventDefault()}
                      className={cn(
                        'grid grid-cols-[auto_1fr_auto] gap-x-3 px-3 py-2.5 items-baseline transition-colors duration-150',
                        p.jobId && 'hover:bg-garage-bg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-garage-orange',
                      )}
                    >
                      <span className="text-xs text-garage-text-muted tabular-nums whitespace-nowrap">{fmtDayTime(p.date)}</span>
                      <span className="text-sm font-medium text-garage-text truncate">
                        {p.jobNumber || <span className="font-normal text-gray-400">—</span>}
                      </span>
                      <span className="text-sm font-bold text-garage-text tabular-nums text-right whitespace-nowrap">
                        {formatMoney(p.amount)}
                      </span>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="px-3 py-6 text-center text-sm text-garage-text-muted">
                  Aucun encaissement ce mois-ci.
                </div>
              )}
              {/* Total de la semaine clôt la feuille */}
              <div className="px-3 py-2.5 border-t-2 border-garage-charcoal bg-garage-bg flex items-center justify-between gap-3">
                <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-garage-text-muted">
                  Total cette semaine
                </span>
                <span className="text-sm font-bold text-garage-text tabular-nums">
                  {formatMoney(revenue?.week?.total ?? 0)}
                </span>
              </div>
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
