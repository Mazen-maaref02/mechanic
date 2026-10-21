import { Fragment, useEffect, useState } from 'react'
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
  type RevenuePayment,
} from '@/lib/db'
import { cn } from '@/lib/utils'

/* ═══════════════════════════════════════════════════════════════════
   Brief d'atelier — direction « Technical Broadsheet »
   Pas de cartes, pas d'arrondis, pas d'ombres : filets et espaces.
   ═══════════════════════════════════════════════════════════════════ */

type Period = 'day' | 'week' | 'month'

const PERIOD_LABEL: Record<Period, string> = {
  day: "Aujourd'hui",
  week: 'Cette semaine',
  month: 'Mois',
}

const METHOD_LABEL: Record<RevenuePayment['method'], string> = {
  cash: 'Espèces',
  transfer: 'Virement',
  other: 'Autre',
}

const STATUS_LABEL: Record<string, string> = {
  received: 'Réceptionnés',
  awaiting_diagnosis: 'En diagnostic',
  awaiting_approval: 'Devis à valider',
  awaiting_parts: 'Attente pièces',
  under_repair: 'En réparation',
  testing: 'En essai',
  finished: 'Terminés',
  delivered: 'Livrés',
}

function fmtTND(n: number): string {
  return new Intl.NumberFormat('fr-TN', { minimumFractionDigits: 3, maximumFractionDigits: 3 }).format(n ?? 0)
}

/* Ligne à points de conduite (sommaire de journal) */
function Leader({ label, value, valueClass }: { label: string; value: string; valueClass?: string }) {
  return (
    <div className="flex items-baseline gap-2 py-1.5">
      <span className="text-[13px] text-garage-text-muted whitespace-nowrap">{label}</span>
      <span aria-hidden className="flex-1 min-w-4 border-b border-dotted border-garage-border" />
      <span className={cn('broad-mono text-[13px] font-medium tabular-nums', valueClass ?? 'text-garage-text')}>{value}</span>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Chargement (données réelles uniquement)                             */
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
        <p className="broad-mono text-[12px] text-garage-text-muted uppercase tracking-[0.15em]">Compositing…</p>
      </div>
    )
  }

  const dateLabel = now.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
  const timeLabel = new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit' }).format(now)

  const series = data.series
  const current = series[period]
  const split = current
    ? {
        cash: current.cash ?? 0,
        transfer: current.transfer ?? 0,
        other: (current.total ?? 0) - (current.cash ?? 0) - (current.transfer ?? 0),
      }
    : { cash: 0, transfer: 0, other: 0 }
  const splitTotal = Math.max(0.001, split.cash + split.transfer + split.other)

  const counts = data.statusCounts ?? {}
  const workshopRows = Object.entries(counts)
    .filter(([st, n]) => n > 0 && st !== 'delivered' && st !== 'finished'
      ? ['received', 'awaiting_diagnosis', 'awaiting_approval', 'awaiting_parts', 'under_repair', 'testing'].includes(st)
      : false)
    .map(([st, n]) => ({ label: STATUS_LABEL[st] || st, n }))

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-8 py-5 text-garage-text">
      {/* ── Manchette ─────────────────────────────────────────────── */}
      <header>
        <div className="flex items-baseline justify-between gap-4 flex-wrap">
          <p className="broad-mono text-[10px] uppercase tracking-[0.22em] text-garage-text-muted">
            Édition du garage
          </p>
          <p className="broad-mono text-[10px] uppercase tracking-[0.18em] text-garage-text-muted tabular-nums">
            {dateLabel} · {timeLabel}
          </p>
        </div>
        <h1 className="broad-display text-3xl sm:text-4xl mt-1 leading-none">
          {data.garageName || 'GaragePro'} <span className="italic text-garage-text-muted">— brief d'atelier</span>
        </h1>
        {/* Double filet de manchette */}
        <div className="mt-3 border-t-[3px] border-garage-text" />
        <div className="mt-[3px] border-t border-garage-border" />
      </header>

      {/* ── Un en-tête : le chiffre du jour ───────────────────────── */}
      <section className="py-6 lg:py-8 flex flex-col lg:flex-row gap-x-12 gap-y-6">
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <p className="broad-mono text-[11px] uppercase tracking-[0.2em] text-garage-text-muted">
              Encaissé — {PERIOD_LABEL[period]}
            </p>
            {/* Périodes : onglets texte soulignés */}
            <div className="flex items-center gap-4" role="tablist">
              {(Object.keys(PERIOD_LABEL) as Period[]).map((p) => (
                <button
                  key={p}
                  role="tab"
                  aria-selected={period === p}
                  onClick={() => setPeriod(p)}
                  className={cn(
                    'broad-mono text-[11px] uppercase tracking-[0.12em] pb-0.5 border-b-2 transition-colors',
                    'focus-visible:outline focus-visible:outline-2 focus-visible:outline-garage-orange focus-visible:outline-offset-2',
                    period === p
                      ? 'text-garage-orange border-garage-orange font-semibold'
                      : 'text-garage-text-muted border-transparent hover:text-garage-text',
                  )}
                >
                  {PERIOD_LABEL[p]}
                </button>
              ))}
            </div>
          </div>
          {/* Le chiffre-manchette, énorme, en serif */}
          <p className="broad-display text-[clamp(3.2rem,9vw,6rem)] leading-[0.95] mt-2 tabular-nums whitespace-nowrap">
            {fmtTND(current?.total ?? 0)}
          </p>
          <p className="broad-mono text-[12px] text-garage-text-muted mt-2 tabular-nums">
            TND · {current?.count ?? 0} encaissement{(current?.count ?? 0) > 1 ? 's' : ''}
            {(current?.average ?? 0) > 0 && <> · moyenne <span className="text-garage-text">{fmtTND(current!.average)}</span></>}
          </p>
        </div>

        {/* Marginalia : espèces / virement */}
        <aside className="w-full lg:w-72 shrink-0 lg:border-l lg:border-garage-border lg:pl-8 flex flex-col justify-end">
          <p className="broad-mono text-[10px] uppercase tracking-[0.2em] text-garage-text-muted mb-2">
            Répartition du moyen
          </p>
          {/* Bandeau bicolre : orange = espèces, encre = virement */}
          {current && current.total > 0 ? (
            <>
              <div className="flex h-2 w-full overflow-hidden" role="img" aria-label="Répartition espèces / virement">
                <div className="bg-garage-orange" style={{ width: `${(split.cash / splitTotal) * 100}%` }} />
                <div className="bg-garage-text/70" style={{ width: `${(split.transfer / splitTotal) * 100}%` }} />
                <div className="bg-garage-border" style={{ width: `${(split.other / splitTotal) * 100}%` }} />
              </div>
              <div className="mt-2">
                <Leader label="Espèces" value={fmtTND(split.cash)} valueClass="text-garage-orange" />
                <Leader label="Virement" value={fmtTND(split.transfer)} />
                {split.other > 0 && <Leader label="Autre" value={fmtTND(split.other)} />}
              </div>
            </>
          ) : (
            <p className="broad-display italic text-lg text-garage-text-muted">Aucun encaissement sur la période.</p>
          )}
        </aside>
      </section>
      <div className="border-t border-garage-border" />

      {/* ── Corps : deux colonnes ─────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-x-12 gap-y-8 pt-6">
        {/* Gauche — le fil du jour */}
        <div className="lg:col-span-7 space-y-8">
          <section aria-label="Encaissements du jour">
            <div className="flex items-baseline justify-between mb-1">
              <h2 className="broad-mono text-[11px] font-semibold uppercase tracking-[0.2em]">Fil du jour</h2>
              <span className="broad-mono text-[11px] text-garage-text-muted tabular-nums">
                {series.day?.count ?? 0} opérations
              </span>
            </div>
            <div className="border-t border-garage-text/60" />
            {series.day && series.day.payments.length > 0 ? (
              <ul className="divide-y divide-garage-border">
                {series.day.payments.map((p) => (
                  <li key={p.id} className="grid grid-cols-[3.5rem_1fr_auto] items-baseline gap-x-3 py-2.5">
                    <span className="broad-mono text-[11px] text-garage-text-muted tabular-nums">
                      {new Date(p.date).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    <span className="min-w-0">
                      {p.jobId ? (
                        <Link to={`/job/${p.jobId}`} className="broad-display italic text-[17px] leading-tight hover:text-garage-orange transition-colors">
                          {p.jobNumber || 'Dossier'}
                        </Link>
                      ) : (
                        <span className="broad-display italic text-[17px] leading-tight text-garage-text-muted">
                          {p.jobNumber || 'Dossier'}
                        </span>
                      )}
                      <span className="broad-mono text-[10px] uppercase tracking-[0.14em] text-garage-text-muted ml-2">
                        {METHOD_LABEL[p.method]}
                      </span>
                    </span>
                    <span className="broad-mono text-sm font-semibold tabular-nums">{fmtTND(p.amount)}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="broad-display italic text-lg text-garage-text-muted py-4">
                Carnet vierge — aucun encaissement aujourd'hui.
              </p>
            )}
          </section>

          <section aria-label="Livraisons du jour">
            <div className="flex items-baseline justify-between mb-1">
              <h2 className="broad-mono text-[11px] font-semibold uppercase tracking-[0.2em]">Sorties du jour</h2>
              <Link to="/finished" className="broad-mono text-[10px] uppercase tracking-[0.14em] text-garage-orange hover:underline">
                Voir terminés
              </Link>
            </div>
            <div className="border-t border-garage-text/60" />
            {data.deliveries && data.deliveries.length > 0 ? (
              <ul className="divide-y divide-garage-border">
                {data.deliveries.map((d) => (
                  <li key={d.id} className="flex items-baseline gap-x-3 py-2.5">
                    <span className="min-w-0 flex-1">
                      <Link to={`/job/${d.id}`} className="broad-display italic text-[17px] leading-tight hover:text-garage-orange transition-colors">
                        {d.vehicle}
                      </Link>
                      <span className="broad-mono text-[10px] uppercase tracking-[0.14em] text-garage-text-muted ml-2">
                        {d.plate}
                      </span>
                      <span className="block broad-mono text-[11px] text-garage-text-muted truncate">
                        {d.jobNumber} · {d.customerName}
                      </span>
                    </span>
                    <span className={cn('broad-mono text-sm font-semibold tabular-nums whitespace-nowrap', d.balance > 0.009 ? 'text-garage-danger' : 'text-garage-success')}>
                      {d.balance > 0.009 ? `${fmtTND(d.balance)} dû` : 'Soldé'}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="broad-display italic text-lg text-garage-text-muted py-4">Rien à livrer aujourd'hui.</p>
            )}
          </section>
        </div>

        {/* Droite — le carnet d'ordre */}
        <aside className="lg:col-span-5 space-y-8">
          <section aria-label="Carnet d'atelier">
            <div className="flex items-baseline justify-between mb-1">
              <h2 className="broad-mono text-[11px] font-semibold uppercase tracking-[0.2em]">Carnet d'atelier</h2>
              <Link to="/maintenance" className="broad-mono text-[10px] uppercase tracking-[0.14em] text-garage-orange hover:underline">
                Ouvrir
              </Link>
            </div>
            <div className="border-t border-garage-text/60" />
            {workshopRows.length > 0 ? (
              <div className="py-1">
                {workshopRows.map((r) => <Leader key={r.label} label={r.label} value={String(r.n)} />)}
                <div className="mt-1 pt-1 border-t border-garage-border">
                  <Leader label="Total en atelier" value={String(data.stats.underMaintenance)} valueClass="font-semibold" />
                </div>
              </div>
            ) : (
              <p className="broad-display italic text-lg text-garage-text-muted py-4">Atelier vide — bravo.</p>
            )}
          </section>

          <section aria-label="À encaisser">
            <div className="flex items-baseline justify-between mb-1">
              <h2 className="broad-mono text-[11px] font-semibold uppercase tracking-[0.2em]">À encaisser</h2>
              <Link to="/invoices" className="broad-mono text-[10px] uppercase tracking-[0.14em] text-garage-orange hover:underline">
                Factures
              </Link>
            </div>
            <div className="border-t border-garage-text/60" />
            {data.outstanding && data.outstanding.count > 0 ? (
              <div className="py-2">
                <p className="broad-mono text-2xl font-semibold tabular-nums">{fmtTND(data.outstanding.sum)} <span className="text-[12px] font-normal text-garage-text-muted">TND</span></p>
                <p className="broad-mono text-[11px] text-garage-text-muted mt-1">
                  {data.outstanding.count} dossier{data.outstanding.count > 1 ? 's' : ''} avec solde ouvert
                </p>
              </div>
            ) : (
              <p className="broad-display italic text-lg text-garage-text-muted py-4">Caisse au complet.</p>
            )}
          </section>

          <section aria-label="Alertes de stock">
            <div className="flex items-baseline justify-between mb-1">
              <h2 className="broad-mono text-[11px] font-semibold uppercase tracking-[0.2em] text-garage-danger">Alerte stock</h2>
              <Link to="/parts" className="broad-mono text-[10px] uppercase tracking-[0.14em] text-garage-orange hover:underline">
                Stock
              </Link>
            </div>
            <div className="border-t border-garage-danger/70" />
            {data.alerts && data.alerts.length > 0 ? (
              <div className="py-1">
                {data.alerts.map((p) => (
                  <Leader
                    key={p.id}
                    label={`${p.name}${p.reference ? ` · ${p.reference}` : ''}`}
                    value={`${p.quantity} / min ${p.min_stock}`}
                    valueClass="text-garage-danger"
                  />
                ))}
              </div>
            ) : (
              <p className="broad-display italic text-lg text-garage-text-muted py-4">Rien sous le seuil.</p>
            )}
          </section>
        </aside>
      </div>

      {/* ── Colophon / actions ────────────────────────────────────── */}
      <footer className="mt-10">
        <div className="border-t border-garage-text" />
        <div className="mt-[3px] border-t border-garage-border" />
        <nav className="flex flex-wrap items-center gap-x-6 gap-y-2 py-4" aria-label="Raccourcis">
          {[
            { label: 'Réceptionner un véhicule', href: '/register' },
            { label: 'Factures', href: '/invoices' },
            { label: 'Stock & pièces', href: '/parts' },
            { label: 'Grand livre des revenus', href: '/revenue' },
            { label: 'Rapports', href: '/reports' },
          ].map((a, i, arr) => (
            <Fragment key={a.href}>
              {i > 0 && <span aria-hidden className="broad-display text-garage-border">·</span>}
              <Link to={a.href} className="broad-mono text-[11px] uppercase tracking-[0.14em] text-garage-text-muted hover:text-garage-orange transition-colors">
                {a.label}
              </Link>
            </Fragment>
          ))}
        </nav>
        <p className="broad-mono text-[10px] text-garage-text-muted uppercase tracking-[0.18em] pb-2">
          GaragePro — l'atelier en un coup d'œil
        </p>
      </footer>
    </div>
  )
}
