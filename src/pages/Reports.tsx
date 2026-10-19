import { useState } from 'react'
import { Card, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { useToastMsg } from '@/components/ui/toaster'
import { getReports, toCSV, downloadCSV } from '@/lib/db'
import { formatMoney } from '@/lib/currency'
import { useT } from '@/lib/i18n'
import { Calendar, Truck, CreditCard, AlertCircle } from 'lucide-react'

function cn(...classes: (string | boolean | undefined | null)[]): string {
  return classes.filter(Boolean).join(' ')
}

export default function Reports() {
  const toast = useToastMsg()
  const t = useT()
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [loading, setLoading] = useState(false)
  const [report, setReport] = useState<any>(null)

  const today = new Date().toISOString().slice(0, 10)
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10)

  async function runReport() {
    if (!from || !to) { toast.error('Choisissez une période.'); return }
    setLoading(true)
    const res = (await getReports({ from, to })) as any as { jobs: any[]; payments: any[]; invoices: any[]; tasks: any[]; jobParts: any[]; error: string | null }
    setLoading(false)
    if (res.error) { toast.error(res.error); return }

    const jobs = res.jobs || []
    const payments = res.payments || []
    const invoices = res.invoices || []
    const tasks = res.tasks || []
    const jobParts = res.jobParts || []

    const toIncl = to + 'T23:59:59'
    const received = jobs.filter((j: any) => j.entry_date >= from && j.entry_date <= toIncl).length
    const delivered = jobs.filter((j: any) => j.status === 'delivered' && j.updated_at >= from && j.updated_at <= toIncl).length

    let revenue = 0
    payments.forEach((p: any) => {
      if (p.payment_date >= from && p.payment_date <= toIncl) revenue += Number(p.amount || 0)
    })

    let unpaid = 0
    invoices.forEach((inv: any) => {
      if ((inv.balance_due || 0) > 0 && !inv.is_paid) unpaid += Number(inv.balance_due || 0)
    })

    const taskCounts: Record<string, number> = {}
    tasks.forEach((t: any) => { taskCounts[t.task_name] = (taskCounts[t.task_name] || 0) + 1 })
    const commonRepairs = Object.entries(taskCounts).sort((a, b) => b[1] - a[1]).slice(0, 5)

    const partCounts: Record<string, number> = {}
    jobParts.forEach((p: any) => { partCounts[p.part_name] = (partCounts[p.part_name] || 0) + Number(p.quantity || 0) })
    const partsUsage = Object.entries(partCounts).sort((a, b) => b[1] - a[1]).slice(0, 5)

    const rows = [
      { label: 'Voitures reçues', value: received },
      { label: 'Voitures livrées', value: delivered },
      { label: 'Revenus (TND)', value: revenue },
      { label: 'Soldes impayés (TND)', value: unpaid },
    ]
    downloadCSV(toCSV(rows), `rapport_garagepro_${from}_${to}.csv`)

    setReport({ received, delivered, revenue, unpaid, commonRepairs, partsUsage })
    toast.success('Rapport généré et exporté en CSV.')
  }

  return (
    <div className="main p-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-garage-text">{t('repTitle')}</h1>
          <p className="text-garage-text-muted text-sm">{t('repSubtitle')}</p>
        </div>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2"><Calendar className="w-4 h-4" /> Filtre de période</CardTitle>
        </CardHeader>
        <div className="p-4 grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs text-garage-text-muted mb-1">{t('repFrom')}</label>
            <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} defaultValue={monthStart} />
          </div>
          <div>
            <label className="block text-xs text-garage-text-muted mb-1">{t('repTo')}</label>
            <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} defaultValue={today} />
          </div>
          <div className="flex items-end">
            <Button onClick={runReport} disabled={loading} className="w-full">
              {loading ? 'Génération...' : t('repExportCSV')}
            </Button>
          </div>
        </div>
      </Card>

      {report ? (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <StatCard title="Voitures reçues" value={report.received} icon={Truck} color="blue" />
          <StatCard title="Voitures livrées" value={report.delivered} icon={Truck} color="green" />
          <StatCard title="Revenus (TND)" value={report.revenue} icon={CreditCard} color="green" money />
          <StatCard title="Soldes impayés (TND)" value={report.unpaid} icon={AlertCircle} color="red" money />
        </div>
      ) : null}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">Réparations fréquentes</CardTitle>
          </CardHeader>
          <div className="p-4">
            <ul className="space-y-2">
              {(report?.commonRepairs || []).map(([name, count]: any) => (
                <li key={name} className="flex justify-between text-sm">
                  <span>{name}</span>
                  <Badge variant="default">{count}</Badge>
                </li>
              ))}
              {!report?.commonRepairs?.length && <div className="text-garage-text-muted text-sm text-center py-4">Aucune donnée.</div>}
            </ul>
          </div>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">Utilisation des pièces</CardTitle>
          </CardHeader>
          <div className="p-4">
            <ul className="space-y-2">
              {(report?.partsUsage || []).map(([name, qty]: any) => (
                <li key={name} className="flex justify-between text-sm">
                  <span>{name}</span>
                  <Badge variant="default">{qty}</Badge>
                </li>
              ))}
              {!report?.partsUsage?.length && <div className="text-garage-text-muted text-sm text-center py-4">Aucune donnée.</div>}
            </ul>
          </div>
        </Card>
      </div>

      <div className="text-garage-text-muted text-xs mt-4">
        Les rapports sont générés à partir des données réelles de la base. L'export CSV contient le résumé de la période sélectionnée.
      </div>
    </div>
  )
}

function StatCard({ title, value, icon: Icon, color, money }: { title: string; value: any; icon: React.ElementType; color: string; money?: boolean }) {
  const colors: Record<string, string> = {
    blue: 'bg-garage-blue-light text-garage-blue border-garage-blue/20',
    green: 'bg-garage-success-light text-garage-success border-garage-success/20',
    red: 'bg-garage-danger-light text-garage-danger border-garage-danger/20',
  }
  return (
    <Card className={cn('p-4', colors[color])}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-medium text-garage-text-muted uppercase tracking-wider">{title}</p>
          <p className="text-xl font-bold">{money ? formatMoney(value) : value}</p>
        </div>
        <Icon className="w-6 h-6 opacity-50" />
      </div>
    </Card>
  )
}
