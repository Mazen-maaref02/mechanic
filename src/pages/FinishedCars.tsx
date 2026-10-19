import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { Card, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { useToastMsg } from '@/components/ui/toaster'
import { getJobs, computeTotals, statusLabel, recordPayment, updateJob, deleteJob } from '@/lib/db'
import { formatMoney, formatDateTime } from '@/lib/currency'
import { normalizePhone, formatDateTime as fmtDT } from '@/lib/utils'
import { useT } from '@/lib/i18n'
import { Search, Truck, Wrench, CreditCard, Phone as PhoneIcon, Filter } from 'lucide-react'

function cn(...classes: (string | boolean | undefined | null)[]): string {
  return classes.filter(Boolean).join(' ')
}

export default function FinishedCars() {
  const { role } = useAuth()
  const navigate = useNavigate()
  const toast = useToastMsg()
  const t = useT()
  const [jobs, setJobs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [payingJob, setPayingJob] = useState<string | null>(null)
  const [payAmount, setPayAmount] = useState('')

  useEffect(() => {
    load()
  }, [search])

  async function load() {
    setLoading(true)
    const { data, error } = await getJobs({ status: 'finished', search: search || undefined, sortBy: 'updated_at', sortDir: 'desc' })
    if (error) { toast.error(error); setLoading(false); return }
    setJobs(data || [])
    setLoading(false)
  }

  async function handleNotify(job: any) {
    const msg = `Bonjour ${job.customer_name}, votre véhicule ${job.vehicle_brand} ${job.vehicle_model} est prêt. Vous pouvez venir le récupérer chez GaragePro.`
    const link = `https://wa.me/${normalizePhone(job.customer_phone || '')}?text=${encodeURIComponent(msg)}`
    window.open(link, '_blank')
    toast.success('WhatsApp ouvert. Vérifiez le message avant d\'envoyer.')
  }

  async function handleRecordPayment(job: any) {
    if (!payAmount || parseFloat(payAmount) <= 0) { toast.error('Montant invalide.'); return }
    const amt = parseFloat(payAmount)
    const { data, error } = await recordPayment(job.id, amt, 'cash', 'Paiement enregistré depuis la liste des terminés', null)
    if (error) { toast.error(error); return }
    // update amount_paid on job
    const newPaid = Number(job.amount_paid || 0) + amt
    await updateJob(job.id, { amount_paid: newPaid })
    setPayingJob(null)
    setPayAmount('')
    toast.success('Paiement enregistré.')
    load()
  }

  async function handleDeliver(job: any) {
    if (!window.confirm(t('finMarkDeliveredConfirm'))) return
    const { error } = await updateJob(job.id, { status: 'delivered' })
    if (error) { toast.error(error); return }
    toast.success(t('finDelivered'))
    load()
  }

  return (
    <div className="main p-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-garage-text">{t('finTitle')}</h1>
          <p className="text-garage-text-muted text-sm">{t('finSubtitle')}</p>
        </div>
      </div>

      <div className="flex gap-4 mb-6">
        <div className="relative flex-1 min-w-[260px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Immatriculation, n° réparation, propriétaire..." className="pl-9" />
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center min-h-[60vh]">{t('loading')}</div>
      ) : jobs.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 mb-4">
            <Truck className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-semibold text-garage-text">{t('finNoCars')}</h3>
          <p className="text-garage-text-muted text-sm mt-2">Aucune voiture n\'est prête pour livraison.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {jobs.map((job) => {
            const totals = computeTotals({
              tasks: job.tasks || [],
              jobParts: job.parts || [],
              additionalCosts: job.additional_costs || 0,
              discount: job.discount || 0,
              amountPaid: job.amount_paid || 0,
            })
            return (
              <Card key={job.id} className="group">
                <div className="p-4">
                  <div className="flex justify-between items-start mb-2">
                    <span className="font-mono text-xs font-bold text-garage-orange">{job.job_number}</span>
                    <Badge variant="success">{statusLabel(job.status)}</Badge>
                  </div>
                  <div className="mb-2">
                    <div className="font-semibold text-garage-text">{job.vehicle_brand} {job.vehicle_model}</div>
                    <div className="text-xs text-garage-text-muted">{job.vehicle_color || '—'} · {job.vehicle_license_plate || '—'}</div>
                  </div>
                  <div className="mb-2">
                    <div className="text-sm font-medium text-garage-text">{job.customer_name || '—'}</div>
                    <div className="flex items-center gap-1 text-xs text-garage-text-muted">
                      <PhoneIcon className="w-3 h-3" /> {normalizePhone(job.customer_phone || '')}
                    </div>
                  </div>
                  <div className="mb-3 space-y-1 text-xs text-garage-text-muted">
                    <div className="flex justify-between">
                      <span>Main-d'œuvre</span> <span>{formatMoney(totals.labor)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Pièces</span> <span>{formatMoney(totals.parts)}</span>
                    </div>
                    <div className="flex justify-between font-medium">
                      <span>Total</span> <span>{formatMoney(totals.total)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Payé</span> <span>{formatMoney(totals.paid)}</span>
                    </div>
                    <div className="flex justify-between text-garage-orange font-medium">
                      <span>Reste</span> <span>{formatMoney(totals.balance)}</span>
                    </div>
                  </div>
                  <div className="text-xs text-garage-text-muted mb-3">
                    {job.expected_completion_date ? `Terminé le ${fmtDT(job.expected_completion_date)}` : '—'}
                  </div>

                  {payingJob === job.id ? (
                    <div className="space-y-2">
                      <Input label="Montant payé (TND)" type="number" value={payAmount} onChange={(e) => setPayAmount(e.target.value)} />
                      <div className="flex gap-2">
                        <Button variant="secondary" size="sm" onClick={() => setPayingJob(null)}>Annuler</Button>
                        <Button size="sm" onClick={() => handleRecordPayment(job)}>Enregistrer</Button>
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-2">
                      <Button size="sm" variant="ghost" onClick={() => handleNotify(job)} className="text-xs px-3 py-2">
                        <PhoneIcon className="w-3 h-3 mr-1" /> Notifier
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setPayingJob(job.id)} className="text-xs px-3 py-2">
                        <CreditCard className="w-3 h-3 mr-1" /> Paiement
                      </Button>
                    </div>
                  )}
                  <div className="mt-3 pt-3 border-t border-garage-border flex gap-2">
                    <Button size="sm" variant="secondary" onClick={() => navigate(`/job/${job.id}`)}>Détail</Button>
                    <Button size="sm" variant="danger" onClick={() => handleDeliver(job)}>Livrée</Button>
                  </div>
                </div>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
