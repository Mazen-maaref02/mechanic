import { useEffect, useState } from 'react'
import { ArrowUpRight, Calendar, CalendarDays, Clock } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardSubtitle } from '@/components/ui/card'
import { useToastMsg } from '@/components/ui/toaster'
import { getRevenueCharts, type RevenuePoint } from '@/lib/db'
import { formatMoney } from '@/lib/currency'
import { useT } from '@/lib/i18n'

function cn(...classes: (string | boolean | undefined | null)[]): string {
  return classes.filter(Boolean).join(' ')
}

interface Series {
  subtitle: string
  total: number
  points: RevenuePoint[]
}

/* Graphique en barres : le total s'affiche, et cliquer sur une barre
   révèle la date (ou l'heure) et le revenu correspondant. Recliquer
   (ou sur « total ») ramène l'affichage du total de la période. */
function RevenueChart({ series, gap = 'gap-[2px]' }: { series: Series; gap?: string }) {
  const [selKey, setSelKey] = useState<string | null>(null)
  const points = series.points
  const max = Math.max(...points.map((p) => p.amount), 1)
  const sel = selKey ? points.find((p) => p.key === selKey) : null

  return (
    <div>
      <div className="text-xs text-garage-text-muted mb-2 min-h-[20px] flex items-center gap-2 flex-wrap">
        {sel ? (
          <>
            <span>
              <span className="font-semibold text-garage-text">{sel.detail}</span> :
              <span className="font-bold text-garage-text ml-1">{formatMoney(sel.amount)}</span>
            </span>
            <button
              onClick={() => setSelKey(null)}
              className="text-[11px] underline underline-offset-2 hover:text-garage-text"
            >
              total de la période
            </button>
          </>
        ) : (
          <span>
            Total : <span className="font-bold text-garage-text">{formatMoney(series.total)}</span>
          </span>
        )}
      </div>
      <div className={cn('flex items-end h-36 border-b border-garage-border pb-1', gap)}>
        {points.map((p) => {
          const h = Math.round((p.amount / max) * 100)
          const selected = p.key === selKey
          return (
            <div
              key={p.key}
              className="flex-1 flex flex-col items-center justify-end h-full cursor-pointer"
              title={`${p.detail} — ${formatMoney(p.amount)}`}
              onClick={() => setSelKey(selected ? null : p.key)}
              role="button"
              aria-label={`${p.detail} : ${formatMoney(p.amount)}`}
            >
              <div
                className={cn(
                  'w-full rounded-t transition-all',
                  selected
                    ? 'bg-garage-orange ring-2 ring-garage-orange/40'
                    : 'bg-garage-orange/70 hover:bg-garage-orange',
                )}
                style={{ height: `${h}%`, minHeight: '2px' }}
              />
            </div>
          )
        })}
      </div>
      <p className="text-[11px] text-garage-text-muted mt-1">
        Cliquez sur une barre pour voir le revenu et sa date.
      </p>
    </div>
  )
}

export default function Revenue() {
  const t = useT()
  const toast = useToastMsg()
  const [data, setData] = useState<{ month: Series; week: Series; day: Series } | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    load()
  }, [])

  async function load() {
    setLoading(true)
    const { data, error } = await getRevenueCharts()
    if (error) toast.error(error)
    setData(data || null)
    setLoading(false)
  }

  if (loading) return (
    <div className="main p-6 flex items-center justify-center min-h-[60vh]">
      <div className="text-garage-text-muted">{t('loading')}</div>
    </div>
  )

  const sections: { title: string; subtitle: string; icon: React.ElementType; series: Series; gap?: string }[] = data
    ? [
        { title: 'Revenu du mois', subtitle: data.month.subtitle, icon: Calendar, series: data.month, gap: 'gap-[2px]' },
        { title: 'Revenu de la semaine', subtitle: data.week.subtitle, icon: CalendarDays, series: data.week, gap: 'gap-1' },
        { title: "Revenu du jour", subtitle: data.day.subtitle, icon: Clock, series: data.day, gap: 'gap-1' },
      ]
    : []

  return (
    <div className="main p-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-garage-text">Revenus</h1>
          <p className="text-garage-text-muted text-sm">Paiements encaissés — mois, semaine et jour, à partir des données réelles.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {sections.map((s) => (
          <Card key={s.title}>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <s.icon className="w-4 h-4" /> {s.title}
              </CardTitle>
              <CardSubtitle>{s.subtitle}</CardSubtitle>
            </CardHeader>
            <div className="p-4">
              <RevenueChart series={s.series} gap={s.gap} />
            </div>
          </Card>
        ))}
      </div>

      {!data && (
        <Card className="p-8 text-center text-garage-text-muted">
          <ArrowUpRight className="w-6 h-6 mx-auto mb-2" />
          Aucune donnée disponible.
        </Card>
      )}
    </div>
  )
}
