import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { CalendarDays, Clock } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardSubtitle } from '@/components/ui/card'
import { useToastMsg } from '@/components/ui/toaster'
import { getRevenueDetails, type RevenueDetailSeries, type RevenuePayment } from '@/lib/db'
import { formatMoney } from '@/lib/currency'
import { useT } from '@/lib/i18n'

function cn(...classes: (string | boolean | undefined | null)[]): string {
  return classes.filter(Boolean).join(' ')
}

/* ---------- Ledger row : date · méthode · véhicule · montant ---------- */

const METHOD_LABEL: Record<RevenuePayment['method'], string> = {
  cash: 'Espèces',
  transfer: 'Virement',
  other: 'Autre',
}

function fmtDayTime(iso: string) {
  const d = new Date(iso)
  const p = (n: number) => String(n).padStart(2, '0')
  return `${p(d.getDate())}/${p(d.getMonth() + 1)} · ${p(d.getHours())}:${p(d.getMinutes())}`
}

/* Regroupe les encaissements par jour : une ligne par date, avec son total */
function groupPaymentsByDay(payments: RevenuePayment[]) {
  const groups: { key: string; label: string; count: number; total: number }[] = []
  const index = new Map<string, number>()
  const p2 = (n: number) => String(n).padStart(2, '0')
  for (const p of payments) {
    const d = new Date(p.date)
    const key = `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}`
    const i = index.get(key)
    if (i === undefined) {
      index.set(key, groups.length)
      groups.push({ key, label: `${p2(d.getDate())}/${p2(d.getMonth() + 1)}`, count: 1, total: p.amount })
    } else {
      groups[i].count += 1
      groups[i].total += p.amount
    }
  }
  return groups
}

const LEDGER_GRID = 'grid grid-cols-[auto_auto_1fr_auto] gap-x-2 sm:gap-x-4 items-baseline'
const DAY_GRID = 'grid grid-cols-[auto_1fr_auto] gap-x-2 sm:gap-x-4 items-baseline'

function LedgerRow({ p }: { p: RevenuePayment }) {
  const row = (
    <div
      className={cn(
        LEDGER_GRID,
        'px-3 py-3 transition-colors duration-150',
      )}
    >
      <span className="text-xs text-garage-text-muted tabular-nums whitespace-nowrap min-w-[84px]">
        {fmtDayTime(p.date)}
      </span>
      <span className="text-[11px] uppercase tracking-[0.08em] text-garage-text-muted whitespace-nowrap">
        {METHOD_LABEL[p.method]}
      </span>
      <span className="text-sm text-garage-text font-medium truncate">
        {p.jobNumber || <span className="text-gray-400 font-normal">—</span>}
      </span>
      <span className="text-sm font-bold text-garage-text tabular-nums text-right whitespace-nowrap">
        {formatMoney(p.amount)}
      </span>
    </div>
  )
  if (!p.jobId) return row
  return (
    <Link
      to={`/job/${p.jobId}`}
      className="block hover:bg-garage-bg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-garage-orange"
    >
      {row}
    </Link>
  )
}

/* ---------- Une feuille de grand-livre (période) ---------- */

/* mode « days » : une ligne par jour avec le total de la journée
   mode « payments » : une ligne par encaissement (feuille du jour)      */
function Ledger({ series, mode }: { series: RevenueDetailSeries; mode: 'days' | 'payments' }) {
  const dayGroups = mode === 'days' ? groupPaymentsByDay(series.payments) : []
  return (
    <div className="border border-garage-border rounded-lg overflow-hidden">
      {/* En-tête de colonnes */}
      <div
        className={cn(
          mode === 'days' ? DAY_GRID : LEDGER_GRID,
          'px-3 pb-2 pt-3 border-b border-garage-border bg-white',
          'text-[10px] font-semibold uppercase tracking-[0.12em] text-garage-text-muted',
        )}
      >
        {mode === 'days' ? (
          <>
            <span>Date</span>
            <span>Encaissements</span>
            <span className="text-right">Total du jour</span>
          </>
        ) : (
          <>
            <span>Date</span>
            <span>Méthode</span>
            <span>Véhicule</span>
            <span className="text-right">Montant</span>
          </>
        )}
      </div>

      {/* mode jours : 19/10 · 3 encaissements · total du jour, filets fins */}
      {mode === 'days' ? (
        dayGroups.length ? (
          <div className="divide-y divide-garage-border">
            {dayGroups.map((g) => (
              <div
                key={g.key}
                className={cn(DAY_GRID, 'px-3 py-3 transition-colors duration-150')}
                title={`Total du jour — ${g.label}`}
              >
                <span className="text-xs text-garage-text-muted tabular-nums whitespace-nowrap min-w-[84px]">
                  {g.label}
                </span>
                <span className="text-[11px] uppercase tracking-[0.08em] text-garage-text-muted truncate">
                  {g.count} {g.count === 1 ? 'encaissement' : 'encaissements'}
                </span>
                <span className="text-sm font-bold text-garage-text tabular-nums text-right whitespace-nowrap">
                  {formatMoney(g.total)}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="px-3 py-8 text-center text-sm text-garage-text-muted">
            Aucun encaissement sur la période.
          </div>
        )
      ) : (
        <>
          {series.payments.length ? (
            <div className="divide-y divide-garage-border">
              {series.payments.map((p) => (
                <LedgerRow key={p.id} p={p} />
              ))}
            </div>
          ) : (
            <div className="px-3 py-8 text-center text-sm text-garage-text-muted">
              Aucun encaissement sur la période.
            </div>
          )}
        </>
      )}

      {/* Dernière ligne : le total clôt la feuille, comme un réel de caisse */}
      <div
        className={cn(
          LEDGER_GRID,
          'px-3 py-3 border-t-2 border-garage-charcoal bg-garage-bg',
        )}
      >
        <span className="text-xs font-semibold uppercase tracking-[0.12em] text-garage-text-muted">Total</span>
        <span />
        <span />
        <span className="text-base font-bold text-garage-text tabular-nums text-right whitespace-nowrap">
          {formatMoney(series.total)}
        </span>
      </div>
    </div>
  )
}

/* ---------- Ligne de marginaux : les 5 chiffres secondaires ---------- */

function Marginalia({ series }: { series: RevenueDetailSeries }) {
  const items = [
    ['Encaissements', String(series.count)],
    ['Paiement moyen', formatMoney(series.average)],
    ['Le plus élevé', formatMoney(series.biggest)],
    ['Espèces', formatMoney(series.cash)],
    ['Virement', formatMoney(series.transfer)],
  ]
  return (
    <dl className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-[11px] text-garage-text-muted">
      {items.map(([label, value]) => (
        <div key={label} className="flex items-baseline gap-1.5">
          <dt className="uppercase tracking-[0.08em]">{label}</dt>
          <dd className="tabular-nums font-semibold text-garage-text">{value}</dd>
        </div>
      ))}
    </dl>
  )
}

/* ---------- Page ---------- */

export default function Revenue() {
  const t = useT()
  const toast = useToastMsg()
  const [data, setData] = useState<{
    month: RevenueDetailSeries
    week: RevenueDetailSeries
    day: RevenueDetailSeries
  } | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    load()
  }, [])

  async function load() {
    setLoading(true)
    const { data, error } = await getRevenueDetails()
    if (error) toast.error(error)
    setData(data || null)
    setLoading(false)
  }

  if (loading) return (
    <div className="main p-6 flex items-center justify-center min-h-[60vh]">
      <div className="text-garage-text-muted">{t('loading')}</div>
    </div>
  )

  if (!data) {
    return (
      <div className="main p-6">
        <Card className="p-8 text-center text-garage-text-muted">
          Aucune donnée disponible.
        </Card>
      </div>
    )
  }

  return (
    <div className="main p-6">
      {/* Feuille du mois : le total du mois est le moment-graphique de la page */}
      <section className="mb-10" aria-labelledby="revenue-month-heading">
        <div className="border-l-4 border-garage-orange pl-5">
          <p id="revenue-month-heading" className="text-[10px] font-semibold uppercase tracking-[0.14em] text-garage-text-muted">
            Total encaissé — {data.month.subtitle}
          </p>
          <p className="mt-1 text-4xl sm:text-5xl font-bold tracking-tight text-garage-text tabular-nums leading-none">
            {formatMoney(data.month.total)}
          </p>
          <Marginalia series={data.month} />
        </div>

        <div className="mt-6">
          <Ledger series={data.month} mode="days" />
        </div>
      </section>

      {/* Feuilles semaine et jour, en vis-à-vis */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        <section aria-labelledby="revenue-week-heading">
          <Card className="p-4 sm:p-6">
            <div className="flex items-center justify-between gap-3 flex-wrap mb-4">
              <h2 id="revenue-week-heading" className="flex items-center gap-2 text-sm font-semibold text-garage-text">
                <CalendarDays className="w-4 h-4 text-garage-text-muted" />
                Revenu de la semaine
              </h2>
              <CardSubtitle>{data.week.subtitle}</CardSubtitle>
            </div>
            <Ledger series={data.week} mode="days" />
            <Marginalia series={data.week} />
          </Card>
        </section>

        <section aria-labelledby="revenue-day-heading">
          <Card className="p-4 sm:p-6">
            <div className="flex items-center justify-between gap-3 flex-wrap mb-4">
              <h2 id="revenue-day-heading" className="flex items-center gap-2 text-sm font-semibold text-garage-text">
                <Clock className="w-4 h-4 text-garage-text-muted" />
                Revenu du jour
              </h2>
              <CardSubtitle>{data.day.subtitle}</CardSubtitle>
            </div>
            <Ledger series={data.day} mode="payments" />
            <Marginalia series={data.day} />
          </Card>
        </section>
      </div>
    </div>
  )
}
