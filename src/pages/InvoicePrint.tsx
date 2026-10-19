import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { useToastMsg } from '@/components/ui/toaster'
import { getInvoices, getJob, getSettings } from '@/lib/db'
import { formatMoney, formatDateTime } from '@/lib/currency'
import { normalizePhone } from '@/lib/utils'
import { useT } from '@/lib/i18n'
import { Printer, ArrowLeft, FileText, AlertCircle } from 'lucide-react'

function cn(...classes: (string | boolean | undefined | null)[]): string {
  return classes.filter(Boolean).join(' ')
}

export default function InvoicePrint() {
  const { id } = useParams()
  const navigate = useNavigate()
  const toast = useToastMsg()
  const t = useT()
  const [invoice, setInvoice] = useState<any>(null)
  const [job, setJob] = useState<any>(null)
  const [settings, setSettings] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!id) return
    setLoading(true)
    Promise.all([getInvoices(), getJob(id!), getSettings()]).then(([invRes, jobRes, setRes]) => {
      if (invRes.error) { toast.error(invRes.error); setLoading(false); return }
      const inv = (invRes.data || []).find((i: any) => i.id === id)
      setInvoice(inv || null)
      setJob(jobRes.data || null)
      setSettings(setRes.data || null)
      setLoading(false)
    })
  }, [id])

  if (loading) return <div className="main p-6 flex items-center justify-center min-h-[60vh]">{t('loading')}</div>
  if (!invoice || !job) return (
    <div className="main p-6 flex flex-col items-center justify-center text-center">
      <AlertCircle className="w-10 h-10 text-garage-danger mb-3" />
      <h2 className="text-lg font-bold text-garage-text">Facture introuvable</h2>
      <Button onClick={() => navigate('/invoices')}>Retour aux factures</Button>
    </div>
  )

  const labor = (job.tasks || []).reduce((s: number, t: any) => s + Number(t.labor_price || 0), 0)
  const partsCost = (job.parts || []).reduce((s: number, p: any) => s + Number(p.quantity || 0) * Number(p.unit_price || 0), 0)
  const subtotal = labor + partsCost + Number(job.additional_costs || 0)
  const total = Math.max(0, subtotal - Number(job.discount || 0))
  const balance = Math.max(0, total - Number(invoice.amount_paid || 0))
  const totals = { labor, parts: partsCost, subtotal, total, balance }
  const isEstimate = invoice.type === 'estimate'

  return (
    <div className="main p-6 no-print flex items-center justify-center">
      <div className="no-print mb-4 flex gap-2">
        <Button variant="ghost" onClick={() => navigate('/invoices')}><ArrowLeft className="w-4 h-4 mr-2" /> Retour</Button>
        <Button onClick={() => window.print()}><Printer className="w-4 h-4 mr-2" /> Imprimer</Button>
      </div>

      {/* Printable invoice container */}
      <div className="max-w-[800px] w-full bg-white p-8 border border-garage-border shadow-lg" id="invoice">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-8 border-b border-garage-border pb-6">
          <div>
            {settings?.logo_url && <img src={settings.logo_url} className="h-10 mb-2" alt="Logo" />}
            <div className="text-2xl font-bold text-garage-text">{settings?.name || 'GaragePro'}</div>
            <div className="text-sm text-garage-text-muted">
              {settings?.address || ''} · {settings?.phone || ''}
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs text-garage-text-muted uppercase tracking-wider font-bold mb-1">
              {isEstimate ? t('invTypeEstimate') : t('invTypeFinal')}
            </div>
            <div className="text-xl font-bold">{invoice.invoice_number}</div>
            <div className="text-sm text-garage-text-muted">{formatDateTime(invoice.issue_date)}</div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-6 mb-8">
          <div>
            <div className="text-xs font-bold text-garage-text-muted uppercase tracking-wider mb-2">Facturé à</div>
            <div className="text-lg font-semibold">{job.customer_name || '—'}</div>
            <div className="text-sm text-garage-text-muted">{normalizePhone(job.customer_phone || '')}</div>
            {job.customer_email && <div className="text-sm text-garage-text-muted">{job.customer_email}</div>}
          </div>
          <div>
            <div className="text-xs font-bold text-garage-text-muted uppercase tracking-wider mb-2">Véhicule</div>
            <div className="text-lg font-semibold">{job.vehicle_brand} {job.vehicle_model}</div>
            <div className="text-sm text-garage-text-muted">{job.vehicle_color || '—'} · {job.vehicle_license_plate || '—'}</div>
            <div className="text-sm text-garage-text-muted">Réparation #{job.job_number}</div>
          </div>
        </div>

        <table className="w-full text-sm border-collapse mb-8">
          <thead>
            <tr className="border-b border-garage-border">
              <th className="text-left pb-2 text-garage-text-muted text-xs uppercase">Désignation</th>
              <th className="text-right pb-2 text-garage-text-muted text-xs uppercase">Qté</th>
              <th className="text-right pb-2 text-garage-text-muted text-xs uppercase">Prix un.</th>
              <th className="text-right pb-2 text-garage-text-muted text-xs uppercase">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-garage-border">
            {(job.tasks || []).map((task: any) => (
              <tr key={task.id} className="text-garage-text">
                <td className="py-3">{task.task_name}</td>
                <td className="py-3 text-right">1</td>
                <td className="py-3 text-right">{formatMoney(task.labor_price)}</td>
                <td className="py-3 text-right font-medium">{formatMoney(task.labor_price)}</td>
              </tr>
            ))}
            {(job.parts || []).map((p: any) => (
              <tr key={p.id} className="text-garage-text">
                <td className="py-3">{p.part_name}</td>
                <td className="py-3 text-right">{p.quantity}</td>
                <td className="py-3 text-right">{formatMoney(p.unit_price)}</td>
                <td className="py-3 text-right font-medium">{formatMoney(Number(p.quantity) * Number(p.unit_price))}</td>
              </tr>
            ))}
            {Number(job.additional_costs || 0) > 0 && (
              <tr className="text-garage-text">
                <td className="py-3">Coûts supplémentaires</td>
                <td className="py-3 text-right">1</td>
                <td className="py-3 text-right">{formatMoney(job.additional_costs)}</td>
                <td className="py-3 text-right font-medium">{formatMoney(job.additional_costs)}</td>
              </tr>
            )}
            {Number(job.discount || 0) > 0 && (
              <tr className="text-garage-text">
                <td className="py-3">Remise</td>
                <td className="py-3 text-right">—</td>
                <td className="py-3 text-right">—</td>
                <td className="py-3 text-right font-medium text-garage-danger">- {formatMoney(job.discount)}</td>
              </tr>
            )}
          </tbody>
        </table>

        <div className="flex justify-end">
          <table className="w-full max-w-xs text-sm">
            <tbody className="divide-y divide-garage-border">
              <tr><td className="py-2 text-garage-text-muted">Sous-total</td><td className="py-2 text-right font-medium">{formatMoney(totals.subtotal)}</td></tr>
              <tr><td className="py-2 text-garage-text-muted">Remise</td><td className="py-2 text-right font-medium">- {formatMoney(Number(job.discount || 0))}</td></tr>
              <tr className="font-bold border-t border-garage-border pt-4"><td className="py-2">Total</td><td className="py-2 text-right">{formatMoney(totals.total)}</td></tr>
              <tr><td className="py-2 text-garage-text-muted">Montant payé</td><td className="py-2 text-right">{formatMoney(invoice.amount_paid)}</td></tr>
              <tr className="font-bold text-garage-orange border-t border-garage-border pt-2"><td className="py-2">Reste à payer</td><td className="py-2 text-right">{formatMoney(totals.balance)}</td></tr>
            </tbody>
          </table>
        </div>

        <div className="mt-8 text-center">
          <div className="text-garage-text-muted text-sm italic">{isEstimate ? t('invEstimateNote') : t('invFinalNote')}</div>
          <div className="mt-4 text-lg font-semibold">{settings?.invoice_footer || t('invThankYou')}</div>
        </div>

        {isEstimate && (
          <div className="mt-6 p-4 bg-garage-warning-light border border-garage-warning/20 rounded text-garage-warning text-xs text-center">
            Ceci est un devis — montant indicatif, pas une facture définitive.
          </div>
        )}
      </div>
    </div>
  )
}
