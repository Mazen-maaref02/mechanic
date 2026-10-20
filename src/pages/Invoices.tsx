import { useEffect, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Card, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { useToastMsg } from '@/components/ui/toaster'
import { getInvoices, getJobs, createInvoice, nextInvoiceNumber, getJob, getUnpaidJobs, recordPayment, updateJob, statusLabel, deleteUnpaidEntry } from '@/lib/db'
import { formatMoney, formatDateTime } from '@/lib/currency'
import { computeTotals } from '@/lib/db'
import { useT } from '@/lib/i18n'
import { useAuth } from '@/contexts/AuthContext'
import { Search, FileText, CreditCard, Printer, ChevronRight, AlertCircle, Trash2 } from 'lucide-react'

function cn(...classes: (string | boolean | undefined | null)[]): string {
  return classes.filter(Boolean).join(' ')
}

export default function Invoices() {
  const navigate = useNavigate()
  const toast = useToastMsg()
  const t = useT()
  const { profile } = useAuth()
  const [invoices, setInvoices] = useState<any[]>([])
  const [unpaid, setUnpaid] = useState<any[]>([])
  const [payAmt, setPayAmt] = useState<Record<string, string>>({})
  const [payMethod, setPayMethod] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [creating, setCreating] = useState(false)
  const [jobs, setJobs] = useState<any[]>([])
  const [selJob, setSelJob] = useState<string>('')
  const [invType, setInvType] = useState<'estimate' | 'final'>('final')

  useEffect(() => {
    load()
    getJobs({ status: 'finished', sortBy: 'entry_date', sortDir: 'desc' }).then(({ data }) => {
      if (data) setJobs(data.filter((j: any) => !j.invoice_id))
    })
  }, [search])

  async function load() {
    setLoading(true)
    const [{ data: invData, error }, { data: unpaidData }] = await Promise.all([
      getInvoices(),
      getUnpaidJobs(),
    ])
    if (error) { toast.error(error); setLoading(false); return }
    setUnpaid(unpaidData || [])
    let list = invData || []
    if (search.trim()) {
      const q = search.trim().toLowerCase()
      list = list.filter((i: any) => i.invoice_number.toLowerCase().includes(q) || (i.customer_name || '').toLowerCase().includes(q))
    }
    setInvoices(list)
    setLoading(false)
  }

  async function handleQuickPay(job: any) {
    const amt = parseFloat(payAmt[job.id] ?? String(job.balance))
    if (!amt || amt <= 0) { toast.error('Entrez un montant valide.'); return }
    if (amt > job.balance + 0.009) { toast.error(`Montant supérieur au reste à payer (${formatMoney(job.balance)}).`); return }
    const method = (payMethod[job.id] || 'cash') as any
    const { error } = await recordPayment(job.id, amt, method, 'Paiement enregistré depuis la liste restent à payer', profile?.id ?? null)
    if (error) { toast.error(error); return }
    const { error: uErr } = await updateJob(job.id, { amount_paid: job.paid + amt })
    if (uErr) { toast.error(uErr); return }
    toast.success(`Paiement de ${formatMoney(amt)} enregistré — ${job.job_number}.`)
    load()
  }

  async function handleDeleteEntry(job: any) {
    const ok = window.confirm(
      `Supprimer définitivement « ${job.job_number} » (${job.customer_name}) ?\n\n` +
      `La réparation, ses tâches, pièces, paiements et sa facture impayée éventuelle seront supprimés — aucun montant ne sera comptabilisé.\n` +
      `Action irréversible.`
    )
    if (!ok) return
    const { error } = await deleteUnpaidEntry(job.id)
    if (error) { toast.error(error); return }
    toast.success(`Réparation ${job.job_number} supprimée.`)
    load()
  }

  function statusBadge(inv: any) {
    if (inv.is_paid) return <Badge variant="success">{t('invStatusPaid')}</Badge>
    if ((inv.amount_paid || 0) > 0) return <Badge variant="warning">{t('invStatusPartial')}</Badge>
    return <Badge variant="danger">{t('invStatusUnpaid')}</Badge>
  }

  async function handleCreate() {
    if (!selJob) { toast.error('Sélectionnez une réparation.'); return }
    const { data: job } = await getJob(selJob)
    if (!job) { toast.error('Réparation introuvable.'); return }
    const { number, error: nErr } = await nextInvoiceNumber('FACT')
    if (nErr) { toast.error(nErr); return }
    if (!number) { toast.error('Impossible de générer le numéro de facture.'); return }
    const totals = computeTotals({
      tasks: job.tasks || [],
      jobParts: job.parts || [],
      additionalCosts: job.additional_costs || 0,
      discount: job.discount || 0,
      amountPaid: job.amount_paid || 0,
    })
    const { error } = await createInvoice({
      invoice_number: number,
      repair_job_id: job.id,
      customer_id: job.customer_id,
      issue_date: new Date().toISOString(),
      type: invType,
      subtotal: totals.subtotal,
      discount: totals.discount,
      total: totals.total,
      amount_paid: totals.paid,
      balance_due: totals.balance,
      is_paid: totals.balance <= 0,
    })
    if (error) { toast.error(error); return }
    toast.success('Facture créée.')
    setCreating(false)
    setSelJob('')
    load()
  }

  if (loading) return <div className="main p-6 flex items-center justify-center min-h-[60vh]">{t('loading')}</div>

  return (
    <div className="main p-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-garage-text">{t('invTitle')}</h1>
          <p className="text-garage-text-muted text-sm">{t('invSubtitle')}</p>
        </div>
      </div>

      {creating ? (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-sm">Créer une facture / devis</CardTitle>
          </CardHeader>
          <div className="p-4 space-y-3">
            <Select label="Réparation terminée" value={selJob} onChange={(e) => setSelJob(e.target.value)}>
              <option value="">Sélectionner...</option>
              {jobs.map((j: any) => <option key={j.id} value={j.id}>{j.job_number} — {j.vehicle_brand} {j.vehicle_model}</option>)}
            </Select>
            <Select label="Type" value={invType} onChange={(e) => setInvType(e.target.value as any)}>
              <option value="final">{t('invTypeFinal')}</option>
              <option value="estimate">{t('invTypeEstimate')}</option>
            </Select>
            <div className="flex gap-2">
              <Button variant="secondary" onClick={() => setCreating(false)}>Annuler</Button>
              <Button onClick={handleCreate}>Créer</Button>
            </div>
            <p className="text-xs text-garage-text-muted">{t('invEstimateNote')}</p>
          </div>
        </Card>
      ) : null}

      <div className="flex items-center gap-4 mb-6">
        <div className="relative flex-1 min-w-[260px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Numéro, client, véhicule..." className="pl-9" />
        </div>
        <Button onClick={() => setCreating(true)}><FileText className="w-4 h-4 mr-2" /> Nouvelle facture</Button>
      </div>

      {/* Cars with unpaid balance — facture not required */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2"><CreditCard className="w-4 h-4" /> Voitures non payées</CardTitle>
          <p className="hidden sm:block text-xs text-garage-text-muted">Reste à encaisser sur chaque réparation — pas besoin de créer une facture. Cliquez « Encaisser » quand le client paie.</p>
        </CardHeader>
        <div className="p-3 sm:p-4">
          {unpaid.length === 0 ? (
            <div className="text-center py-6 text-garage-text-muted text-sm">Tout est payé — aucune voiture avec du reste à encaisser.</div>
          ) : (
            <>
              {/* Phone: compact cards */}
              <div className="md:hidden space-y-2">
                {unpaid.map((j: any) => (
                  <div key={j.id} className="border border-garage-border rounded-lg p-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-xs font-bold text-garage-orange" onClick={() => navigate(`/job/${j.id}`)} role="button">{j.job_number}</span>
                      <Badge>{statusLabel(j.status)}</Badge>
                    </div>
                    <div className="mt-1 text-sm font-medium truncate">{j.customer_name}</div>
                    <div className="text-xs text-garage-text-muted truncate">{j.vehicle} ({j.plate})</div>
                    <div className="mt-1 flex items-center gap-2 text-xs">
                      <span className="text-garage-text-muted">Total <b className="text-garage-text">{formatMoney(j.total)}</b></span>
                      <span className="text-garage-text-muted">Payé {formatMoney(j.paid)}</span>
                      <span className="text-garage-danger font-bold ml-auto">Reste {formatMoney(j.balance)}</span>
                    </div>
                    <div className="mt-2 flex gap-1">
                      <input
                        type="number"
                        className="input flex-1 min-w-0 py-1.5 text-xs"
                        placeholder={String(Math.round(j.balance * 100) / 100)}
                        value={payAmt[j.id] ?? ''}
                        onChange={(e) => setPayAmt({ ...payAmt, [j.id]: e.target.value })}
                      />
                      <select
                        className="input w-16 py-1.5 text-xs shrink-0"
                        value={payMethod[j.id] ?? 'cash'}
                        onChange={(e) => setPayMethod({ ...payMethod, [j.id]: e.target.value })}
                      >
                        <option value="cash">Espèces</option>
                        <option value="card">Carte</option>
                        <option value="check">Chèque</option>
                        <option value="bank_transfer">Virement</option>
                      </select>
                      <Button size="sm" variant="primary" className="shrink-0" onClick={() => handleQuickPay(j)}>Encaisser</Button>
                      <button
                        type="button"
                        onClick={() => handleDeleteEntry(j)}
                        title="Supprimer cette réparation"
                        className="text-garage-danger hover:bg-garage-danger-light rounded-lg p-1.5 shrink-0 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop: table */}
              <div className="hidden md:block overflow-x-auto">
              <table className="table">
                <thead>
                  <tr>
                    <th>{t('invInvoiceNumber') /* N° dossier */}</th>
                    <th>{t('invCustomer')}</th>
                    <th>{t('invVehicle')}</th>
                    <th className="text-right">{t('invTotal')}</th>
                    <th className="text-right">{t('invPaid')}</th>
                    <th className="text-right">{t('invBalance')}</th>
                    <th>Statut</th>
                    <th>Encaisser</th>
                  </tr>
                </thead>
                <tbody>
                  {unpaid.map((j: any) => (
                    <tr key={j.id} className="table-row">
                      <td className="font-mono text-sm font-semibold cursor-pointer text-garage-orange underline" onClick={() => navigate(`/job/${j.id}`)}>{j.job_number}</td>
                      <td className="text-sm">{j.customer_name}</td>
                      <td className="text-sm text-garage-text-muted">{j.vehicle} <span className="text-xs">({j.plate})</span></td>
                      <td className="text-sm text-right font-medium">{formatMoney(j.total)}</td>
                      <td className="text-sm text-right">{formatMoney(j.paid)}</td>
                      <td className="text-sm text-right font-bold text-garage-danger">{formatMoney(j.balance)}</td>
                      <td className="text-sm"><Badge>{statusLabel(j.status)}</Badge></td>
                      <td className="text-sm">
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            className="input w-24 py-1.5 text-xs"
                            placeholder={String(Math.round(j.balance * 100) / 100)}
                            value={payAmt[j.id] ?? ''}
                            onChange={(e) => setPayAmt({ ...payAmt, [j.id]: e.target.value })}
                          />
                          <select
                            className="input w-24 py-1.5 text-xs"
                            value={payMethod[j.id] ?? 'cash'}
                            onChange={(e) => setPayMethod({ ...payMethod, [j.id]: e.target.value })}
                          >
                            <option value="cash">Espèces</option>
                            <option value="card">Carte</option>
                            <option value="check">Chèque</option>
                            <option value="bank_transfer">Virement</option>
                          </select>
                          <Button size="sm" variant="primary" onClick={() => handleQuickPay(j)}>Encaisser</Button>
                          <button
                            type="button"
                            onClick={() => handleDeleteEntry(j)}
                            title="Supprimer cette réparation"
                            className="text-garage-danger hover:bg-garage-danger-light rounded-lg p-2 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>
            </>
          )}
        </div>
      </Card>

      {invoices.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 text-center">
          <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 mb-4"><FileText className="w-8 h-8" /></div>
          <h3 className="text-lg font-semibold text-garage-text">{t('invNoInvoices')}</h3>
          <p className="text-garage-text-muted text-sm mt-1">Les factures apparaîtront ici quand vous les créerez — les paiements des voitures ci-dessus se font sans facture.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="table">
            <thead>
              <tr>
                <th>{t('invInvoiceNumber')}</th>
                <th>{t('invDate')}</th>
                <th>{t('invCustomer')}</th>
                <th>{t('invVehicle')}</th>
                <th>{t('invType')}</th>
                <th className="text-right">{t('invTotal')}</th>
                <th className="text-right">{t('invPaid')}</th>
                <th className="text-right">{t('invBalance')}</th>
                <th>{t('invStatus')}</th>
                <th className="text-right">{t('actions')}</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((inv) => (
                <tr key={inv.id} className="table-row">
                  <td className="font-mono text-sm font-semibold">{inv.invoice_number}</td>
                  <td className="text-sm">{formatDateTime(inv.issue_date)}</td>
                  <td className="text-sm">{inv.customer_name || '—'}</td>
                  <td className="text-sm text-garage-text-muted">{inv.vehicle_brand} {inv.vehicle_model}</td>
                  <td className="text-sm">
                    {inv.type === 'estimate' ? t('invTypeEstimate') : t('invTypeFinal')}
                  </td>
                  <td className="text-sm text-right font-medium">{formatMoney(inv.total)}</td>
                  <td className="text-sm text-right">{formatMoney(inv.amount_paid)}</td>
                  <td className="text-sm text-right">{formatMoney(inv.balance_due)}</td>
                  <td className="text-sm">{statusBadge(inv)}</td>
                  <td className="text-sm text-right">
                    <Button size="sm" variant="ghost" onClick={() => window.open(`/invoice/${inv.id}/print`, '_blank')}>
                      <Printer className="w-3 h-3" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
