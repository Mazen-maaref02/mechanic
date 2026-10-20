import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { Card, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input, Textarea, Select } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { useToastMsg } from '@/components/ui/toaster'
import {
  getJob, getTasks, getJobParts, getPayments, getStatusHistory,
  addTask, deleteTask, addJobPart, deleteJobPart, changeStatus, statusLabel,
  recordPayment, deletePayment, updateJob,
  computeTotals,
} from '@/lib/db'
import { formatMoney, formatDateTime } from '@/lib/currency'
import { normalizePhone, formatDateTime as fmtDT } from '@/lib/utils'
import { useT } from '@/lib/i18n'
import {
  Wrench, Car, User, Phone as PhoneIcon, Clock, MapPin, Plus, Trash2,
  Save, CheckCircle2, CreditCard, Printer, History, ChevronRight, ArrowLeft,
  Phone, FileText, Settings as SettingsIcon, Package,
} from 'lucide-react'

function cn(...classes: (string | boolean | undefined | null)[]): string {
  return classes.filter(Boolean).join(' ')
}

const STATUSES: { value: string; label: string }[] = [
  { value: 'received', label: 'Réceptionné' },
  { value: 'awaiting_diagnosis', label: 'En attente de diagnostic' },
  { value: 'awaiting_approval', label: 'En attente de validation client' },
  { value: 'awaiting_parts', label: 'En attente de pièces' },
  { value: 'under_repair', label: 'En réparation' },
  { value: 'testing', label: 'Contrôle qualité / Essais' },
  { value: 'finished', label: 'Terminé — prêt à retirer' },
]

export default function CarDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user, profile, role } = useAuth()
  const toast = useToastMsg()
  const t = useT()
  const [job, setJob] = useState<any>(null)
  const [tasks, setTasks] = useState<any[]>([])
  const [parts, setParts] = useState<any[]>([])
  const [payments, setPayments] = useState<any[]>([])
  const [history, setHistory] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  // status change
  const [newStatus, setNewStatus] = useState<string>('')
  const [statusNote, setStatusNote] = useState('')

  // task
  const [taskName, setTaskName] = useState('')
  const [laborPrice, setLaborPrice] = useState('')

  // part
  const [partName, setPartName] = useState('')
  const [partQty, setPartQty] = useState('1')
  const [partUnitPrice, setPartUnitPrice] = useState('0')
  const [useStock, setUseStock] = useState(false)

  // payment
  const [payAmount, setPayAmount] = useState('')
  const [payMethod, setPayMethod] = useState<'cash' | 'transfer' | 'other'>('cash')

  // invoice
  const [invoiceCreated, setInvoiceCreated] = useState(false)

  useEffect(() => {
    load()
  }, [id])

  async function load() {
    if (!id) return
    setLoading(true)
    const [jRes, tRes, pRes, payRes, hRes] = await Promise.all([
      getJob(id), getTasks(id), getJobParts(id), getPayments(id), getStatusHistory(id),
    ])
    if (jRes.error) { toast.error(jRes.error); setLoading(false); return }
    setJob(jRes.data)
    setTasks(tRes.data || [])
    setParts(pRes.data || [])
    setPayments(payRes.data || [])
    setHistory((hRes.data || []).map((h: any) => ({ ...h, changed_by_name: h.profiles?.full_name || 'Inconnu' })))
    setLoading(false)
  }

  const totals = job ? computeTotals({
    tasks: job.tasks || tasks,
    jobParts: job.parts || parts,
    additionalCosts: job.additional_costs || 0,
    discount: job.discount || 0,
    amountPaid: job.amount_paid || 0,
  }) : { labor: 0, parts: 0, additional: 0, discount: 0, subtotal: 0, total: 0, paid: 0, balance: 0 }

  async function handleStatusChange() {
    if (!newStatus) { toast.error('Choisissez un statut.'); return }
    const { error } = await changeStatus(id!, newStatus as any, statusNote || null, profile?.id ?? null)
    if (error) { toast.error(error); return }
    toast.success(t('detailUpdateSuccess'))
    setNewStatus('')
    setStatusNote('')
    load()
  }

  async function handleAddTask() {
    if (!taskName.trim()) return
    const { error } = await addTask(id!, taskName, parseFloat(laborPrice || '0') || 0)
    if (error) { toast.error(error); return }
    setTaskName(''); setLaborPrice('')
    load()
  }

  async function handleAddPart() {
    if (!partName.trim()) return
    const { error } = await addJobPart(id!, {
      spare_part_id: useStock ? '' : null,
      part_name: partName,
      quantity: parseInt(partQty, 10) || 1,
      unit_price: parseFloat(partUnitPrice || '0') || 0,
    })
    if (error) { toast.error(error); return }
    setPartName(''); setPartQty('1'); setPartUnitPrice('0'); setUseStock(false)
    load()
  }

  async function handleRecordPayment() {
    const amt = parseFloat(payAmount)
    if (!amt || amt <= 0) { toast.error('Montant invalide.'); return }
    const { error } = await recordPayment(id!, amt, payMethod, 'Paiement depuis le détail', profile?.id ?? null)
    if (error) { toast.error(error); return }
    const newPaid = Number(job?.amount_paid || 0) + amt
    await updateJob(id!, { amount_paid: newPaid })
    setPayAmount('')
    load()
  }

  async function handleDeletePayment(paymentId: string, amount: number) {
    if (!window.confirm('Supprimer ce paiement ?')) return
    const { error } = await deletePayment(paymentId)
    if (error) { toast.error(error); return }
    const newPaid = Math.max(0, Number(job?.amount_paid || 0) - amount)
    await updateJob(id!, { amount_paid: newPaid })
    load()
  }

  async function handleMarkFinished() {
    if (!window.confirm('Marquer cette réparation comme terminée ?')) return
    const { error } = await changeStatus(id!, 'finished', 'Réparation terminée.', profile?.id ?? null)
    if (error) { toast.error(error); return }
    toast.success('Réparation terminée.')
    load()
  }

  if (!job) {
    return (
      <div className="main p-6 flex items-center justify-center min-h-[60vh]">
        {loading ? <div>{t('loading')}</div> : <div>Véhicule introuvable.</div>}
      </div>
    )
  }

  return (
    <div className="main p-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <Button variant="ghost" size="sm" onClick={() => navigate('/maintenance')}><ArrowLeft className="w-4 h-4 mr-2" /> Retour</Button>
          <h1 className="text-2xl font-bold text-garage-text">{t('detailTitle')}</h1>
          <p className="text-garage-text-muted text-sm">{job.job_number}</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={job.status === 'finished' ? 'success' : 'info'}>{statusLabel(job.status)}</Badge>
        </div>
      </div>

      {/* Header info */}
      <Card className="mb-6">
        <CardHeader className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2"><Car className="w-5 h-5" /> {job.vehicle_brand} {job.vehicle_model}</CardTitle>
            <div className="text-garage-text-muted text-sm">
              {job.vehicle_color || '—'} · {job.vehicle_license_plate || '—'}
              {job.vin ? ` · VIN: ${job.vin}` : ''}
            </div>
          </div>
          <div className="flex gap-3 w-full lg:w-auto">
            <Button size="sm" variant="primary" onClick={() => handleMarkFinished()} disabled={job.status === 'finished' || job.status === 'delivered'}>
              <CheckCircle2 className="w-4 h-4 mr-2" /> {t('detailMarkFinished')}
            </Button>
            <Button size="sm" variant="secondary" onClick={() => navigate(`/invoice/new?job=${job.id}`)}><FileText className="w-4 h-4 mr-2" /> Facture</Button>
          </div>
        </CardHeader>
        <div className="p-6 border-t border-garage-border grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <div className="text-xs text-garage-text-muted">Propriétaire</div>
            <div className="font-semibold">{job.customer_name || '—'}</div>
          </div>
          <div>
            <div className="text-xs text-garage-text-muted">Téléphone</div>
            <div className="font-semibold flex items-center gap-1">
              <PhoneIcon className="w-3 h-3" /> {normalizePhone(job.customer_phone || '')}
            </div>
          </div>
          <div>
            <div className="text-xs text-garage-text-muted">Immatriculation</div>
            <div className="font-semibold">{job.vehicle_license_plate || '—'}</div>
          </div>
          <div>
            <div className="text-xs text-garage-text-muted">Entrée</div>
            <div className="font-semibold">{fmtDT(job.entry_date)}</div>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left: status + history */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Changer le statut</CardTitle>
            </CardHeader>
            <div className="p-4 space-y-3">
              <Select value={newStatus} onChange={(e) => setNewStatus(e.target.value)}>
                <option value="">Nouveau statut</option>
                {STATUSES.filter(s => s.value !== job.status).map((s) => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </Select>
              <Textarea label="Note (optionnel)" rows={2} value={statusNote} onChange={(e) => setStatusNote(e.target.value)} placeholder="Ex. pièces commandées" />
              <Button onClick={handleStatusChange} className="w-full" disabled={!newStatus}>
                <Save className="w-4 h-4 mr-2" /> Enregistrer le changement
              </Button>
            </div>
          </Card>

          <Card className="mt-4">
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2"><History className="w-4 h-4" /> Historique</CardTitle>
            </CardHeader>
            <div className="p-3 space-y-3 max-h-[400px] overflow-y-auto">
              {history.length ? history.map((h) => (
                <div key={h.id} className="text-xs space-y-1">
                  <div className="flex justify-between text-garage-text-muted">
                    <span>{fmtDT(h.changed_at)}</span>
                    <span>{statusLabel(h.new_status as any)}</span>
                  </div>
                  <div className="text-garage-text">{h.changed_by_name}</div>
                  {h.note && <div className="text-[10px] text-garage-text-muted">{h.note}</div>}
                </div>
              )) : <div className="text-garage-text-muted text-xs">Aucun historique.</div>}
            </div>
          </Card>
        </div>

        {/* Center: tasks + parts */}
        <div className="lg:col-span-2">
          <Card className="mb-4">
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2"><Wrench className="w-4 h-4" /> Tâches / main-d'œuvre</CardTitle>
            </CardHeader>
            <div className="p-4">
              <div className="flex flex-col sm:flex-row sm:items-end gap-1 sm:gap-2 mb-3">
                <div className="w-full sm:flex-1 sm:min-w-0">
                  <Input label="Tâche" value={taskName} onChange={(e) => setTaskName(e.target.value)} placeholder="Ex. Vidange" className="w-full text-xs" />
                </div>
                <div className="w-1/2 sm:w-28">
                  <Input label="Prix (TND)" type="number" value={laborPrice} onChange={(e) => setLaborPrice(e.target.value)} className="w-full text-xs" />
                </div>
                <Button size="sm" className="w-full sm:w-auto h-10 px-4 shrink-0" onClick={handleAddTask}><Plus className="w-4 h-4 mr-1 sm:mr-0" /> Ajouter</Button>
              </div>
              <div className="space-y-2">
                {tasks.length ? tasks.map((task) => (
                  <div key={task.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                    <div className="text-sm">{task.task_name}</div>
                    <div className="text-xs text-garage-text-muted">{formatMoney(task.labor_price)}</div>
                    <Button size="sm" variant="danger" onClick={() => { deleteTask(task.id); load() }}><Trash2 className="w-3 h-3" /></Button>
                  </div>
                )) : <div className="text-garage-text-muted text-xs text-center py-2">Aucune tâche.</div>}
              </div>
            </div>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2"><FileText className="w-4 h-4" /> Pièces & fournitures</CardTitle>
            </CardHeader>
            <div className="p-4">
              <div className="flex flex-col sm:flex-row sm:items-end gap-1 sm:gap-2 mb-3">
                <div className="w-full sm:flex-1 sm:min-w-0">
                  <Input label="Pièce" value={partName} onChange={(e) => setPartName(e.target.value)} placeholder="Ex. Filtre à huile" className="w-full text-xs" />
                </div>
                <div className="flex gap-2">
                  <div className="w-1/3 sm:w-20">
                    <Input label="Qté" type="number" value={partQty} onChange={(e) => setPartQty(e.target.value)} className="w-full text-xs" />
                  </div>
                  <div className="flex-1 sm:w-40 sm:shrink-0">
                    <Input label="Prix unitaire (TND)" type="number" value={partUnitPrice} onChange={(e) => setPartUnitPrice(e.target.value)} className="w-full text-xs" />
                  </div>
                </div>
                <Button size="sm" className="w-full sm:w-auto h-10 px-4 shrink-0" onClick={handleAddPart}><Plus className="w-4 h-4 mr-1 sm:mr-0" /> Ajouter</Button>
              </div>
              <div className="space-y-2">
                {parts.length ? parts.map((p) => (
                  <div key={p.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                    <div className="text-sm">{p.part_name}</div>
                    <div className="flex items-center gap-2 text-xs text-garage-text-muted">
                      <span>{p.quantity} × {formatMoney(p.unit_price)}</span>
                    </div>
                    <Button size="sm" variant="danger" onClick={() => { deleteJobPart(p.id, p.spare_part_id, p.quantity); load() }}><Trash2 className="w-3 h-3" /></Button>
                  </div>
                )) : <div className="text-garage-text-muted text-xs text-center py-2">Aucune pièce.</div>}
              </div>
            </div>
          </Card>
        </div>

        {/* Right: totals + payments */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2"><CreditCard className="w-4 h-4" /> Totaux</CardTitle>
            </CardHeader>
            <div className="p-4 space-y-3">
              <div className="flex justify-between text-sm"><span>Main-d'œuvre</span><span>{formatMoney(totals.labor)}</span></div>
              <div className="flex justify-between text-sm"><span>Pièces</span><span>{formatMoney(totals.parts)}</span></div>
              <div className="flex justify-between text-sm"><span>Coûts supplémentaires</span><span>{formatMoney(totals.additional)}</span></div>
              <div className="flex justify-between text-sm"><span>Remise</span><span>- {formatMoney(totals.discount)}</span></div>
              <div className="flex justify-between font-semibold border-t border-garage-border pt-2"><span>Total</span><span>{formatMoney(totals.total)}</span></div>
              <div className="flex justify-between text-sm"><span>Payé</span><span>{formatMoney(totals.paid)}</span></div>
              <div className={`flex justify-between items-baseline border-t border-garage-border pt-3 ${totals.balance > 0.009 ? 'text-garage-orange' : 'text-green-600'}`}>
                <span className="font-semibold">{totals.balance > 0.009 ? 'Reste à payer' : 'Solde réglé'}</span>
                <span className="text-lg font-bold">{formatMoney(totals.balance)}</span>
              </div>
              <div className="pt-3 border-t border-garage-border">
                <Input label="Montant payé (TND)" type="number" value={payAmount} onChange={(e) => setPayAmount(e.target.value)} className="text-xs" />
                <Select label="Mode" value={payMethod} onChange={(e) => setPayMethod(e.target.value as any)}>
                  <option value="cash">Espèces</option>
                  <option value="transfer">Virement bancaire</option>
                  <option value="other">Autre</option>
                </Select>
                <Button onClick={handleRecordPayment} className="w-full" disabled={!payAmount || parseFloat(payAmount) <= 0}>
                  <Save className="w-4 h-4 mr-2" /> Enregistrer le paiement
                </Button>
              </div>
            </div>
          </Card>

          <Card className="mt-4">
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2"><History className="w-4 h-4" /> Paiements</CardTitle>
            </CardHeader>
            <div className="p-3 space-y-2 max-h-[240px] overflow-y-auto">
              {payments.length ? payments.map((p) => (
                <div key={p.id} className="flex items-center justify-between text-xs p-1.5 bg-gray-50 rounded">
                  <div className="flex flex-col gap-0.5">
                    <div className="text-garage-text">{formatMoney(p.amount)}</div>
                    <div className="text-[10px] text-garage-text-muted capitalize">{p.payment_method}</div>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-[10px] text-garage-text-muted">{fmtDT(p.payment_date)}</span>
                    <Button size="sm" variant="danger" className="p-1" onClick={() => handleDeletePayment(p.id, p.amount)}><Trash2 className="w-3 h-3" /></Button>
                  </div>
                </div>
              )) : <div className="text-garage-text-muted text-xs text-center py-2">Aucun paiement.</div>}
            </div>
          </Card>
        </div>
      </div>

      {/* Bottom full-width: photos (only if any) + repair notes */}
      {(job.photos || []).length > 0 ? (
        <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2"><Package className="w-4 h-4" /> Photos du véhicule</CardTitle>
            </CardHeader>
            <div className="p-4">
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                {(job.photos as string[]).map((src, i) => (
                  <a key={i} href={src} target="_blank" rel="noreferrer" className="block">
                    <img src={src} alt={`Photo ${i + 1}`} className="w-full h-24 object-cover rounded-lg border border-garage-border hover:opacity-80 transition-opacity" />
                  </a>
                ))}
              </div>
            </div>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2"><SettingsIcon className="w-4 h-4" /> Notes de réparation</CardTitle>
            </CardHeader>
            <div className="p-4">
              <Textarea rows={4} value={job.notes || ''} onChange={(e) => {}} disabled placeholder="Ajoutez une note de réparation..." />
              <div className="mt-3 text-xs text-garage-text-muted">Modifiez les notes depuis le formulaire d'édition (à venir).</div>
            </div>
          </Card>
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-1 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2"><SettingsIcon className="w-4 h-4" /> Notes de réparation</CardTitle>
            </CardHeader>
            <div className="p-4">
              <Textarea rows={4} value={job.notes || ''} onChange={(e) => {}} disabled placeholder="Ajoutez une note de réparation..." />
              <div className="mt-3 text-xs text-garage-text-muted">Modifiez les notes depuis le formulaire d'édition (à venir).</div>
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}
