import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import {
  getDashboardStats,
  getRevenueDetails,
  getDashboardStockAlerts,
  getDashboardDeliveries,
  getUnpaidJobs,
  type RevenueDetailSeries,
  type DashboardDelivery,
} from '@/lib/db'
import { formatMoney } from '@/lib/currency'
import { ThemeToggle } from '@/components/ui/theme-toggle'
import {
  CarFront, Wrench, Truck, CreditCard, FileText, Package, Banknote,
  AlertTriangle, ArrowRight,
} from 'lucide-react'

/* ------------------------------------------------------------------ */
/* Encaissé : interrupteur Aujourd'hui / Semaine / Mois                */
/* ------------------------------------------------------------------ */
type Period = 'day' | 'week' | 'month'

const PERIOD_LABEL: Record<Period, string> = {
  day: "Aujourd'hui",
  week: 'Cette semaine',
  month: 'Ce mois',
}

function RevenueHero({ series }: { series: Record<Period, RevenueDetailSeries | null> }) {
  const [period, setPeriod] = useState<Period>('day')
  const s = series[period]
  return (
    <section
      className="rounded-lg border border-garage-border bg-garage-surface shadow-card p-5 border-l-4 border-l-garage-orange"
      aria-label="Encaissements de la période"
    >
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-garage-text-muted">
          Encaissé — {PERIOD_LABEL[period]}
        </p>
        <div className="flex rounded-lg border border-garage-border overflow-hidden" role="tablist">
          {(Object.keys(PERIOD_LABEL) as Period[]).map((p) => (
            <button
              key={p}
              role="tab"
              aria-selected={period === p}
              onClick={() => setPeriod(p)}
              className={
                'px-3 py-1.5 text-xs font-medium transition-colors ' +
                (period === p
                  ? 'bg-garage-orange text-garage-on-primary'
                  : 'bg-transparent text-garage-text-muted hover:bg-garage-subtle hover:text-garage-text')
              }
            >
              {PERIOD_LABEL[p]}
            </button>
          ))}
        </div>
      </div>
      <div className="mt-3 flex items-end gap-3 flex-wrap">
        <p className="text-3xl sm:text-4xl font-bold tracking-tight text-garage-text tabular-nums leading-none">
          {s ? formatMoney(s.total) : '—'}
        </p>
        {s && s.count > 0 && (
          <p className="text-xs text-garage-text-muted pb-1">
            {s.count} encaissement{s.count > 1 ? 's' : ''}
            {' · moyenne '}
            <span className="tabular-nums">{formatMoney(s.average)}</span>
          </p>
        )}
      </div>
      <div className="mt-3">
        <Link to="/revenue" className="inline-flex items-center gap-1 text-xs font-medium text-garage-orange hover:underline">
          Grand livre des revenus <ArrowRight className="w-3 h-3" />
        </Link>
      </div>
    </section>
  )
}

/* ------------------------------------------------------------------ */
/* Cartes indicateurs                                                  */
/* ------------------------------------------------------------------ */
interface Kpi {
  label: string
  value: string
  sub?: string
  icon: React.ElementType
  color: 'orange' | 'blue' | 'green' | 'red'
  href?: string
}

const KPI_STYLES: Record<Kpi['color'], string> = {
  orange: 'bg-garage-orange-light text-garage-orange border-garage-orange/20',
  blue: 'bg-garage-blue-light text-garage-blue border-garage-blue/20',
  green: 'bg-garage-success-light text-garage-success border-garage-success/20',
  red: 'bg-garage-danger-light text-garage-danger border-garage-danger/20',
}

function KpiCard({ kpi }: { kpi: Kpi }) {
  const Icon = kpi.icon
  const inner = (
    <div className="rounded-lg border border-garage-border bg-garage-surface shadow-card p-4 h-full transition-shadow hover:shadow-card-hover">
      <div className="flex items-start justify-between gap-2">
        <p className="text-[10px] font-semibold text-garage-text-muted uppercase tracking-[0.12em] leading-tight pt-0.5">
          {kpi.label}
        </p>
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 border ${KPI_STYLES[kpi.color]}`}>
          <Icon className="w-4 h-4" />
        </div>
      </div>
      <p className="mt-1 text-2xl font-bold text-garage-text tabular-nums leading-tight">{kpi.value}</p>
      {kpi.sub && <p className="mt-0.5 text-xs text-garage-text-muted">{kpi.sub}</p>}
    </div>
  )
  return kpi.href
    ? <Link to={kpi.href} className="block group">{inner}</Link>
    : <div>{inner}</div>
}

/* ------------------------------------------------------------------ */
/* Actions rapides                                                     */
/* ------------------------------------------------------------------ */
function QuickActions() {
  const actions = [
    { label: 'Réception véhicule', href: '/register', icon: CarFront },
    { label: 'Factures', href: '/invoices', icon: FileText },
    { label: 'Stock pièces', href: '/parts', icon: Package },
    { label: 'Revenus', href: '/revenue', icon: Banknote },
  ]
  return (
    <section aria-label="Actions rapides">
      <h2 className="text-sm font-semibold text-garage-text mb-2">Actions rapides</h2>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {actions.map((a) => {
          const Icon = a.icon
          return (
            <Link
              key={a.href}
              to={a.href}
              className="flex flex-col items-center gap-2 rounded-lg border border-garage-border bg-garage-surface shadow-card px-3 py-4 transition-colors hover:border-garage-orange/50 hover:bg-garage-orange-light/40"
            >
              <Icon className="w-5 h-5 text-garage-orange" />
              <span className="text-xs font-medium text-garage-text text-center leading-tight">{a.label}</span>
            </Link>
          )
        })}
      </div>
    </section>
  )
}

/* ------------------------------------------------------------------ */
/* Alertes stock (quantité <= seuil minimum)                           */
/* ------------------------------------------------------------------ */
function StockAlerts({ alerts }: { alerts: { id: string; name: string; reference: string | null; quantity: number; min_stock: number }[] | null }) {
  return (
    <section
      className="rounded-lg border border-garage-border bg-garage-surface shadow-card overflow-hidden"
      aria-label="Alertes de stock"
    >
      <div className="flex items-center justify-between gap-2 px-4 pt-4">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-garage-danger" />
          <h2 className="text-sm font-semibold text-garage-text">Alertes stock</h2>
          {alerts && alerts.length > 0 && (
            <span className="text-[10px] font-bold uppercase tracking-wider bg-garage-danger-light text-garage-danger rounded-full px-2 py-0.5">
              {alerts.length} référence{alerts.length > 1 ? 's' : ''}
            </span>
          )}
        </div>
        <Link to="/parts" className="text-xs font-medium text-garage-text-muted hover:text-garage-text">
          Voir le stock
        </Link>
      </div>
      <div className="p-4">
        {alerts && alerts.length > 0 ? (
          <ul className="divide-y divide-garage-border">
            {alerts.map((p) => (
              <li key={p.id} className="flex items-center justify-between gap-3 py-2.5">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-garage-text truncate">{p.name}</p>
                  {p.reference && <p className="text-[11px] text-garage-text-muted truncate">{p.reference}</p>}
                </div>
                <span className="text-xs font-bold tabular-nums whitespace-nowrap text-garage-danger">
                  {p.quantity} / min {p.min_stock}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-garage-text-muted py-2">
            {alerts ? 'Stock au niveau — aucune pièce sous le minimum.' : '—'}
          </p>
        )}
      </div>
    </section>
  )
}

/* ------------------------------------------------------------------ */
/* Livraisons du jour                                                  */
/* ------------------------------------------------------------------ */
function Deliveries({ deliveries }: { deliveries: DashboardDelivery[] | null }) {
  return (
    <section
      className="rounded-lg border border-garage-border bg-garage-surface shadow-card overflow-hidden"
      aria-label="Livraisons du jour"
    >
      <div className="flex items-center justify-between gap-2 px-4 pt-4">
        <div className="flex items-center gap-2">
          <Truck className="w-4 h-4 text-garage-success" />
          <h2 className="text-sm font-semibold text-garage-text">Livraisons du jour</h2>
          {deliveries && deliveries.length > 0 && (
            <span className="text-[10px] font-bold uppercase tracking-wider bg-garage-success-light text-garage-success rounded-full px-2 py-0.5">
              {deliveries.length}
            </span>
          )}
        </div>
        <Link to="/finished" className="text-xs font-medium text-garage-text-muted hover:text-garage-text">
          Voir terminés
        </Link>
      </div>
      <div className="p-4">
        {deliveries && deliveries.length > 0 ? (
          <ul className="divide-y divide-garage-border">
            {deliveries.map((d) => (
              <li key={d.id} className="py-2.5">
                <Link to={`/job/${d.id}`} className="flex items-start justify-between gap-3 group">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-garage-text truncate group-hover:underline">
                      {d.vehicle}
                      <span className="ml-2 text-[11px] font-medium text-garage-text-muted tabular-nums">{d.plate}</span>
                    </p>
                    <p className="text-[11px] text-garage-text-muted truncate">
                      {d.jobNumber} · {d.customerName}
                    </p>
                  </div>
                  <span className={
                    'text-sm font-bold tabular-nums whitespace-nowrap ' +
                    (d.balance > 0.009 ? 'text-garage-danger' : 'text-garage-success')
                  }>
                    {d.balance > 0.009 ? `${formatMoney(d.balance)} dû` : 'Soldé'}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-garage-text-muted py-2">
            {deliveries ? 'Aucune livraison enregistrée aujourd\u2019hui.' : '—'}
          </p>
        )}
      </div>
    </section>
  )
}

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

const EMPTY_STATS = {
  totalCars: 0, underMaintenance: 0, awaitingDiagnosis: 0, awaitingParts: 0,
  finished: 0, delivered: 0, unpaidInvoices: 0, revenueToday: 0, revenueMonth: 0,
}

interface DashData {
  stats: typeof EMPTY_STATS
  series: Record<Period, RevenueDetailSeries | null>
  outstanding: { sum: number; count: number } | null
  alerts: { id: string; name: string; reference: string | null; quantity: number; min_stock: number }[] | null
  deliveries: DashboardDelivery[] | null
}

export default function Dashboard() {
  const { refresh } = useAuth()
  const [data, setData] = useState<DashData | null>(null)
  const [loading, setLoading] = useState(true)
  const [now, setNow] = useState(new Date())

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 60_000)
    return () => clearInterval(t)
  }, [])

  useEffect(() => { load() }, [refresh])

  async function load() {
    setLoading(true)
    const [s, rev, alertsRes, deliveriesRes, unpaid] = await Promise.all([
      getDashboardStats(),
      getRevenueDetails(),
      getDashboardStockAlerts(),
      getDashboardDeliveries(),
      getUnpaidJobs(),
    ])

    setData({
      stats: s.data || EMPTY_STATS,
      series: rev.data
        ? { day: rev.data.day, week: rev.data.week, month: rev.data.month }
        : { day: null, week: null, month: null },
      outstanding: unpaid.error || !unpaid.data
        ? null
        : {
            sum: unpaid.data.reduce((t: number, j: any) => t + Number(j.balance || 0), 0),
            count: unpaid.data.length,
          },
      alerts: alertsRes.error ? null : (alertsRes.data ?? []),
      deliveries: deliveriesRes.error ? null : (deliveriesRes.data ?? []),
    })
    setLoading(false)
  }

  if (loading || !data) {
    return (
      <div className="main p-6 flex items-center justify-center min-h-[60vh]">
        <p className="text-sm text-garage-text-muted">Chargement du tableau de bord…</p>
      </div>
    )
  }

  const dateLabel = now.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
  const timeLabel = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`

  const kpis: Kpi[] = [
    {
      label: 'En atelier',
      value: String(data.stats.underMaintenance),
      sub: `${data.stats.awaitingDiagnosis} diagnostic · ${data.stats.awaitingParts} attente pièces`,
      icon: Wrench, color: 'orange', href: '/maintenance',
    },
    {
      label: 'À encaisser',
      value: data.outstanding ? formatMoney(data.outstanding.sum) : '—',
      sub: data.outstanding ? `${data.outstanding.count} dossier${data.outstanding.count > 1 ? 's' : ''} avec solde` : undefined,
      icon: CreditCard, color: 'red', href: '/invoices',
    },
    {
      label: 'Terminées',
      value: String(data.stats.finished),
      sub: `${data.stats.totalCars} dossier${data.stats.totalCars > 1 ? 's' : ''} actifs`,
      icon: Truck, color: 'green', href: '/finished',
    },
    {
      label: 'Livrées',
      value: String(data.stats.delivered),
      sub: 'Depuis l\u2019ouverture du garage',
      icon: Truck, color: 'blue',
    },
  ]

  return (
    <div className="main p-4 sm:p-6 space-y-6">
      {/* En-tête */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold text-garage-text leading-tight">Tableau de bord</h1>
          <p className="text-sm text-garage-text-muted capitalize">
            {dateLabel} <span className="tabular-nums non-italic">· {timeLabel}</span>
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <ThemeToggle />
          <Link to="/register" className="btn-primary px-4 py-2.5 text-sm">
            <CarFront className="w-4 h-4 mr-2" /> Réceptionner un véhicule
          </Link>
        </div>
      </header>

      {/* Encaissé (période) */}
      <RevenueHero series={data.series} />

      {/* Indicateurs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {kpis.map((k) => <KpiCard key={k.label} kpi={k} />)}
      </div>

      {/* Actions rapides */}
      <QuickActions />

      {/* Alertes + livraisons */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
        <StockAlerts alerts={data.alerts} />
        <Deliveries deliveries={data.deliveries} />
      </div>
    </div>
  )
}
