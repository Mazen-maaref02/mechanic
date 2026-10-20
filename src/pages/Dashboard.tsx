import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import {
  getDashboardStats,
  getRevenueDetails,
  getDashboardStockAlerts,
  getDashboardDeliveries,
  getDashboardStatusCounts,
  getUnpaidJobs,
  getSettings,
  type RevenueDetailSeries,
  type DashboardDelivery,
} from '@/lib/db'
import { ThemeToggle } from '@/components/ui/theme-toggle'
import { cn } from '@/lib/utils'
import {
  CalendarDays, Banknote, Wrench, ReceiptText, Truck,
  CarFront, FileText, Package, AlertTriangle,
  MessageCircle, FolderOpen, CheckCircle2, PersonStanding,
} from 'lucide-react'

type Period = 'day' | 'week' | 'month'

const PERIOD_LABEL: Record<Period, string> = {
  day: "Aujourd'hui",
  week: 'Cette semaine',
  month: 'Mois',
}

/* Montant « métrique » style Stitch : 4 850,000 (sans suffixe, TND en légende) */
function fmtTND(n: number): string {
  return new Intl.NumberFormat('fr-TN', { minimumFractionDigits: 3, maximumFractionDigits: 3 }).format(n ?? 0)
}

/* ------------------------------------------------------------------ */
/* Carte KPI 2x2 « Precision Motorsport »                              */
/* ------------------------------------------------------------------ */
function Kpi({
  label, icon: Icon, iconTile, children, footer,
}: {
  label: string
  icon: React.ElementType
  iconTile: string
  children: React.ReactNode
  footer?: React.ReactNode
}) {
  return (
    <div className="relative overflow-hidden p-3.5 rounded-xl border border-garage-border bg-garage-surface shadow-card flex flex-col justify-between">
      <div className="flex items-start justify-between">
        <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-garage-text-muted">{label}</span>
        <div className={cn('w-7 h-7 rounded-lg flex items-center justify-center shrink-0', iconTile)}>
          <Icon className="w-[18px] h-[18px]" />
        </div>
      </div>
      <div className="mt-2">{children}</div>
      {footer}
    </div>
  )
}

function Metric({ value, caption, tone = 'text' }: { value: string; caption: string; tone?: 'primary' | 'text' | 'success' }) {
  const toneClass = tone === 'primary' ? 'text-garage-orange' : tone === 'success' ? 'text-garage-success' : 'text-garage-text'
  return (
    <div>
      <div className={cn('text-lg sm:text-xl font-bold tracking-tight tabular-nums leading-none', toneClass)}>{value}</div>
      <div className="mt-1 text-[10px] font-semibold uppercase tracking-wider text-garage-text-muted">{caption}</div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

const EMPTY_STATS = {
  totalCars: 0, underMaintenance: 0, awaitingDiagnosis: 0, awaitingParts: 0,
  finished: 0, delivered: 0, unpaidInvoices: 0, revenueToday: 0, revenueMonth: 0,
}

interface AlertPart {
  id: string
  name: string
  reference: string | null
  quantity: number
  min_stock: number
}

interface DashData {
  stats: typeof EMPTY_STATS
  series: Record<Period, RevenueDetailSeries | null>
  outstanding: { sum: number; count: number } | null
  alerts: AlertPart[] | null
  deliveries: DashboardDelivery[] | null
  statusCounts: Record<string, number> | null
  garageName: string | null
}

export default function Dashboard() {
  const { refresh } = useAuth()
  const [data, setData] = useState<DashData | null>(null)
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState<Period>('day')
  const [now, setNow] = useState(new Date())

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 60_000)
    return () => clearInterval(t)
  }, [])

  useEffect(() => { load() }, [refresh])

  async function load() {
    setLoading(true)
    const [s, rev, alertsRes, deliveriesRes, unpaid, counts, settings] = await Promise.all([
      getDashboardStats(),
      getRevenueDetails(),
      getDashboardStockAlerts(),
      getDashboardDeliveries(),
      getUnpaidJobs(),
      getDashboardStatusCounts(),
      getSettings(),
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
      statusCounts: counts.data || {},
      garageName: settings.data?.name ?? null,
    })
    setLoading(false)
  }

  if (loading || !data) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[60vh]">
        <p className="text-sm text-garage-text-muted">Chargement du tableau de bord…</p>
      </div>
    )
  }

  const dateLabel = now.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
  const hourLabel = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`

  const series = data.series
  const current = series[period]
  const monthTotal = series.month?.total ?? 0
  const pctOfMonth = period !== 'month' && monthTotal > 0
    ? Math.min(100, Math.round(((current?.total ?? 0) / monthTotal) * 100))
    : null

  const counts = data.statusCounts ?? {}
  const repCount = (counts['under_repair'] || 0) + (counts['testing'] || 0)
  const liveCount = data.stats.underMaintenance
  const totalAll = data.stats.totalCars + data.stats.delivered
  const deliveredPct = totalAll > 0 ? Math.round((data.stats.delivered / totalAll) * 100) : 0

  const visibleAlerts = (data.alerts ?? []).slice(0, 2)

  return (
    <div className="max-w-4xl mx-auto px-3 sm:px-6 py-4 space-y-4">
      {/* En-tête de bienvenue (nom du garage réel) */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 mb-0.5">
              <span className="w-2 h-2 rounded-full bg-garage-success" />
              <span className="text-[11px] font-semibold text-garage-success uppercase tracking-wider truncate">
                {data.garageName || 'GaragePro'}
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-garage-text tracking-tight truncate">Tableau de bord</h1>
            <p className="mt-0.5 flex items-center gap-1.5 text-xs text-garage-text-muted">
              <CalendarDays className="w-[15px] h-[15px] text-garage-orange" />
              <span className="capitalize">{dateLabel}</span>
              <span className="text-garage-border font-bold">·</span>
              <span className="text-garage-blue font-semibold tabular-nums">{hourLabel}</span>
            </p>
          </div>
          <ThemeToggle />
        </div>

        {/* Sélecteur de période — pilule segmented */}
        <div className="grid grid-cols-3 p-1 rounded-xl bg-garage-subtle gap-1" role="tablist">
          {(Object.keys(PERIOD_LABEL) as Period[]).map((p) => (
            <button
              key={p}
              role="tab"
              aria-selected={period === p}
              onClick={() => setPeriod(p)}
              className={cn(
                'py-1.5 text-center rounded-lg text-xs font-semibold transition-all active:scale-95',
                period === p
                  ? 'bg-garage-orange text-garage-on-primary shadow-sm'
                  : 'text-garage-text-muted hover:text-garage-text',
              )}
            >
              {PERIOD_LABEL[p]}
            </button>
          ))}
        </div>
      </div>

      {/* KPI Grid 2x2 */}
      <div className="grid grid-cols-2 gap-3">
        {/* KPI 1 : Encaissé (période sélectionnée) */}
        <Kpi
          label={`Encaissé · ${PERIOD_LABEL[period]}`}
          icon={Banknote}
          iconTile="bg-garage-orange/15 text-garage-orange"
          footer={
            current && (pctOfMonth !== null || period === 'month') ? (
              <div className="mt-2.5">
                {period === 'month' ? (
                  <div className="flex items-center gap-1.5 text-[11px] font-semibold text-garage-orange">
                    <span className="w-1.5 h-1.5 rounded-full bg-garage-orange animate-pulse" />
                    {current.count} encaissement{current.count > 1 ? 's' : ''}
                  </div>
                ) : (
                  <>
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-bold text-garage-success">+{pctOfMonth}% du mois</span>
                      <span className="text-garage-text-muted">en {PERIOD_LABEL[period].toLowerCase()}</span>
                    </div>
                    <div className="w-full h-1 bg-garage-subtle rounded-full mt-1.5 overflow-hidden">
                      <div className="h-full bg-garage-orange rounded-full" style={{ width: `${pctOfMonth ?? 0}%` }} />
                    </div>
                  </>
                )}
              </div>
            ) : null
          }
        >
          <Metric value={fmtTND(current?.total ?? 0)} caption="TND" tone="primary" />
        </Kpi>

        {/* KPI 2 : En atelier */}
        <Kpi
          label="En atelier"
          icon={Wrench}
          iconTile="bg-garage-blue/15 text-garage-blue"
          footer={
            <div className="mt-2 flex items-center gap-1 flex-wrap">
              <span className="px-1.5 py-0.5 rounded bg-garage-blue/20 text-garage-blue text-[10px] font-bold">
                {data.stats.awaitingDiagnosis} Diag
              </span>
              <span className="px-1.5 py-0.5 rounded bg-garage-orange/20 text-garage-orange text-[10px] font-bold">
                {repCount} Rep
              </span>
              <span className="px-1.5 py-0.5 rounded bg-garage-subtle text-garage-text-muted text-[10px] font-bold">
                {data.stats.awaitingParts} Att. pièces
              </span>
            </div>
          }
        >
          <div className="flex items-baseline gap-1.5">
            <span className="text-xl font-extrabold tracking-tight text-garage-text">{liveCount}</span>
            <span className="text-xs font-semibold text-garage-blue">véhicules</span>
          </div>
        </Kpi>

        {/* KPI 3 : À encaisser */}
        <Kpi
          label="À encaisser"
          icon={ReceiptText}
          iconTile="bg-garage-orange/20 text-garage-orange"
          footer={
            data.outstanding && data.outstanding.count > 0 ? (
              <div className="mt-2 flex items-center gap-1.5 text-[11px] font-semibold text-garage-orange">
                <span className="w-1.5 h-1.5 rounded-full bg-garage-orange animate-pulse" />
                {data.outstanding.count} dossier{data.outstanding.count > 1 ? 's' : ''} à régler
              </div>
            ) : (
              <div className="mt-2 flex items-center gap-1.5 text-[11px] font-semibold text-garage-success">
                <span className="w-1.5 h-1.5 rounded-full bg-garage-success" />
                Tout est encaissé
              </div>
            )
          }
        >
          <Metric value={fmtTND(data.outstanding?.sum ?? 0)} caption="TND en attente" />
        </Kpi>

        {/* KPI 4 : Livrées */}
        <Kpi
          label="Livrées"
          icon={Truck}
          iconTile="bg-garage-success/15 text-garage-success"
          footer={
            <div className="w-full bg-garage-subtle h-1.5 rounded-full mt-2 overflow-hidden">
              <div className="bg-garage-success h-full rounded-full" style={{ width: `${deliveredPct}%` }} />
            </div>
          }
        >
          <div className="flex items-baseline gap-1.5">
            <span className="text-xl font-extrabold tracking-tight text-garage-success">{data.stats.delivered}</span>
            <span className="text-xs text-garage-text-muted">{deliveredPct}% des dossiers</span>
          </div>
        </Kpi>
      </div>

      {/* Actions rapides */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-garage-text tracking-tight">Actions Rapides</h2>
          <span className="text-[10px] font-bold text-garage-orange uppercase tracking-wider">Atelier Direct</span>
        </div>
        <div className="grid grid-cols-4 gap-2">
          {[
            { label: 'Réception Express', href: '/register', icon: CarFront, tile: 'bg-garage-orange text-garage-on-primary shadow' },
            { label: 'Factures', href: '/invoices', icon: FileText, tile: 'bg-garage-subtle text-garage-blue' },
            { label: 'Stock Pièces', href: '/parts', icon: Package, tile: 'bg-garage-subtle text-garage-success' },
            { label: 'Revenus', href: '/revenue', icon: Banknote, tile: 'bg-garage-subtle text-garage-orange' },
          ].map((a) => {
            const Icon = a.icon
            return (
              <Link
                key={a.href}
                to={a.href}
                className="group flex flex-col items-center justify-center p-2.5 rounded-xl bg-garage-surface hover:bg-garage-subtle text-center transition-all active:scale-95 shadow-card"
              >
                <div className={cn('w-11 h-11 rounded-xl flex items-center justify-center group-hover:scale-105 transition-transform', a.tile)}>
                  <Icon className="w-6 h-6" />
                </div>
                <span className="text-[11px] leading-tight font-semibold text-garage-text mt-2">{a.label}</span>
              </Link>
            )
          })}
        </div>
      </div>

      {/* Alerte stock (références au seuil) */}
      {data.alerts && data.alerts.length > 0 && (
        <Link
          to="/parts"
          className="flex items-center gap-3 p-3 rounded-xl bg-garage-danger-light text-garage-text shadow-card active:scale-[0.99] transition-transform"
        >
          <div className="shrink-0 w-8 h-8 rounded-lg bg-garage-danger text-white flex items-center justify-center">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] font-bold text-garage-danger uppercase tracking-wider">Alerte Stock Immédiate</span>
              <span className="text-[10px] font-bold text-garage-danger px-1.5 py-0.5 rounded bg-garage-danger-light ring-1 ring-garage-danger/30">
                {data.alerts.length} référence{data.alerts.length > 1 ? 's' : ''}
              </span>
            </div>
            <p className="text-xs text-garage-text-muted truncate mt-0.5">
              {visibleAlerts.map((p) => `${p.name} (${p.quantity} · min ${p.min_stock})`).join(', ')}
              {data.alerts.length > 2 && ` +${data.alerts.length - 2} autres`}
            </p>
          </div>
        </Link>
      )}

      {/* Livraisons du jour */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-garage-text tracking-tight">Livraisons du Jour</h2>
            {data.deliveries && data.deliveries.length > 0 && (
              <span className="w-5 h-5 rounded-full bg-garage-orange text-garage-on-primary text-[11px] font-bold flex items-center justify-center">
                {data.deliveries.length}
              </span>
            )}
          </div>
          <Link to="/finished" className="text-[11px] font-semibold text-garage-orange hover:underline">Voir terminés</Link>
        </div>

        {data.deliveries && data.deliveries.length > 0 ? (
          data.deliveries.map((d) => {
            const sold = d.balance <= 0.009
            const waDigits = (d.customerPhone || '').replace(/\D/g, '')
            const waText = encodeURIComponent(`Bonjour ${d.customerName}, votre ${d.vehicle} est prête. Merci de votre confiance.`)
            return (
              <div key={d.id} className="p-4 rounded-xl border border-garage-border bg-garage-surface shadow-card space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <div className="px-2 py-0.5 rounded bg-garage-subtle text-garage-text font-mono font-bold text-[12px] shadow-sm">
                        {d.plate}
                      </div>
                      <span
                        className={cn(
                          'px-2 py-0.5 rounded text-[11px] font-bold flex items-center gap-1',
                          sold ? 'bg-garage-success/20 text-garage-success' : 'bg-garage-danger/20 text-garage-danger',
                        )}
                      >
                        <span className={cn('w-1.5 h-1.5 rounded-full', sold ? 'bg-garage-success' : 'bg-garage-danger animate-pulse')} />
                        {sold ? 'Solde réglé' : 'Solde à encaisser'}
                      </span>
                    </div>
                    <h3 className="text-base font-bold text-garage-text mt-1.5 truncate">{d.vehicle}</h3>
                    <p className="flex items-center gap-1.5 text-xs text-garage-text-muted">
                      <PersonStanding className="w-[15px] h-[15px]" />
                      <span className="text-garage-text font-semibold">{d.customerName}</span>
                      <span className="text-garage-border">·</span>
                      <span className="tabular-nums">{d.customerPhone || '—'}</span>
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-garage-text-muted">
                      {sold ? 'Solde TTC' : 'Reste à payer'}
                    </span>
                    <div className={cn('font-mono font-bold text-base tabular-nums', sold ? 'text-garage-success' : 'text-garage-danger')}>
                      {fmtTND(sold ? d.total : d.balance)}
                    </div>
                    <span className="text-[10px] font-semibold text-garage-text-muted">TND</span>
                  </div>
                </div>
                {/* Actions directes */}
                <div className="grid grid-cols-2 gap-2 pt-1">
                  {waDigits && (
                    <a
                      href={`https://wa.me/${waDigits}?text=${waText}`}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-garage-success text-white text-xs font-bold shadow-sm active:scale-95 transition-transform"
                    >
                      <MessageCircle className="w-[18px] h-[18px]" />
                      <span>Aviser WhatsApp</span>
                    </a>
                  )}
                  <Link
                    to={`/job/${d.id}`}
                    className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-garage-subtle hover:bg-garage-border/60 text-garage-text text-xs font-semibold active:scale-95 transition-all"
                  >
                    {sold
                      ? <><FolderOpen className="w-[18px] h-[18px] text-garage-orange" /><span>Ouvrir le dossier</span></>
                      : <><CheckCircle2 className="w-[18px] h-[18px] text-garage-orange" /><span>Encaisser le solde</span></>}
                  </Link>
                </div>
              </div>
            )
          })
        ) : (
          <div className="p-4 rounded-xl border border-garage-border bg-garage-surface shadow-card flex items-center gap-2.5">
            <CheckCircle2 className="w-5 h-5 text-garage-success shrink-0" />
            <p className="text-sm text-garage-text-muted">
              {data.deliveries ? 'Aucune livraison enregistrée aujourd\u2019hui.' : '—'}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
