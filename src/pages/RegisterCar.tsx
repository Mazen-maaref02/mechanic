import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { Card, CardHeader, CardTitle, CardSubtitle } from '@/components/ui/card'
import { Input, Textarea, Select } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useToastMsg } from '@/components/ui/toaster'
import {
  createCustomer, createVehicle, createJob, generateJobNumber,
  searchCustomers, getCustomers, changeStatus, addTask, addJobPart,
} from '@/lib/db'
import { isValidTunisianPhone, normalizePhone } from '@/lib/utils'
import { formatMoney } from '@/lib/currency'
import { useT } from '@/lib/i18n'
import { Search, User, Hash, Truck, AlertCircle, CheckCircle, Wrench, FileText, Plus, Trash2 } from 'lucide-react'

function cn(...classes: (string | boolean | undefined | null)[]): string {
  return classes.filter(Boolean).join(' ')
}

const FUEL_TYPES = [
  { value: 'essence', label: 'Essence' },
  { value: 'diesel', label: 'Diesel' },
  { value: 'hybride', label: 'Hybride' },
  { value: 'electrique', label: 'Électrique' },
  { value: 'gpl', label: 'GPL' },
  { value: 'autre', label: 'Autre' },
]

const PRIORITIES = [
  { value: 'normal', label: 'Normale' },
  { value: 'urgent', label: 'Urgente' },
  { value: 'very_urgent', label: 'Très urgente' },
]

interface FormState {
  brand_model: string
  color: string
  license_plate: string
  model_year: string
  mileage: string
  fuel_type: string
  vin: string
  reported_problem: string
  initial_diagnosis: string
  assigned_mechanic: string
  priority: 'normal' | 'urgent' | 'very_urgent'
  expected_completion: string
  notes: string
  entry_date: string
  // owner (used when no existing customer selected)
  owner_name: string
  owner_phone: string
  owner_email: string
  owner_address: string
}

const EMPTY_FORM: FormState = {
  brand_model: '', color: '', license_plate: '', model_year: '', mileage: '',
  fuel_type: 'essence', vin: '', reported_problem: '', initial_diagnosis: '',
  assigned_mechanic: '', priority: 'normal', expected_completion: '', notes: '',
  entry_date: '', owner_name: '', owner_phone: '', owner_email: '', owner_address: '',
}

export default function RegisterCar() {
  const { profile } = useAuth()
  const navigate = useNavigate()
  const toast = useToastMsg()
  const t = useT()
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState<{ saved: boolean; jobNumber: string; jobId: string } | null>(null)
  const [jobNumber, setJobNumber] = useState<string>('')
  // Tasks & parts entered at reception time (saved once the job is created)
  const [tasks, setTasks] = useState<{ name: string; price: string }[]>([])
  const [taskDraft, setTaskDraft] = useState({ name: '', price: '' })
  const [parts, setParts] = useState<{ name: string; qty: string; price: string }[]>([])
  const [partDraft, setPartDraft] = useState({ name: '', qty: '', price: '' })

  // Customer search / selection — "existing client" is the default (returning clients)
  const [clientMode, setClientMode] = useState<'existing' | 'new'>('existing')
  const [customerSearch, setCustomerSearch] = useState('')
  const [customers, setCustomers] = useState<any[]>([])
  const [selectedCustomer, setSelectedCustomer] = useState<any | null>(null)

  // Form
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    generateJobNumber('GAR').then(({ number }) => {
      if (number) setJobNumber(number)
      const now = new Date()
      const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 16)
      setForm((f) => ({ ...f, entry_date: local }))
    })
  }, [])

  // Prefilled from a client page ("Réceptionner sa voiture" button)
  const location = useLocation() as { state?: { customerId?: string } }
  useEffect(() => {
    const preId = (location.state as any)?.customerId
    if (!preId) return
    ;(async () => {
      const { data } = await getCustomers()
      const c = (data || []).find((x: any) => x.id === preId)
      if (c) selectCustomer(c)
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.state])

  async function handleCustomerSearch(q: string) {
    if (!q.trim()) { setCustomers([]); return }
    const { data, error } = await searchCustomers(q)
    if (error) { toast.error(error); return }
    setCustomers(data || [])
  }

  function selectCustomer(c: any) {
    setSelectedCustomer(c)
    setCustomerSearch(c.full_name)
    setCustomers([])
    setClientMode('existing')
    // prefill owner fields
    setForm((f) => ({ ...f, owner_name: c.full_name, owner_phone: c.phone, owner_email: c.email || '', owner_address: c.address || '' }))
  }

  function startCreateCustomer() {
    setClientMode('new')
    setSelectedCustomer(null)
    setCustomers([])
    setForm((f) => ({ ...f, owner_name: '', owner_phone: '', owner_email: '', owner_address: '' }))
  }

  async function validate(): Promise<boolean> {
    const e: Record<string, string> = {}
    if (!form.brand_model.trim()) e.brand_model = t('required')
    if (!form.color.trim()) e.color = t('required')
    if (!form.reported_problem.trim()) e.reported_problem = t('required')
    if (!form.entry_date) e.entry_date = t('required')
    if (clientMode === 'new') {
      if (!form.owner_name.trim()) e.owner_name = t('required')
      if (!form.owner_phone.trim()) e.owner_phone = t('required')
      else if (!isValidTunisianPhone(form.owner_phone)) e.owner_phone = t('phoneInvalid')
    } else if (!selectedCustomer) {
      e.customer = 'Cherchez le client et sélectionnez-le dans la liste.'
    } else if (!isValidTunisianPhone(selectedCustomer.phone)) {
      e.customer = t('phoneInvalid')
    }
    setErrors(e)
    if (Object.keys(e).length > 0) {
      toast.error('Complétez ou corrigez les champs signalés en rouge.')
      return false
    }
    return true
  }

  async function resolveCustomer(): Promise<{ id: string } | null> {
    if (clientMode === 'existing') return selectedCustomer
    if (clientMode === 'new') {
      const { data, error } = await createCustomer({
        full_name: form.owner_name,
        phone: normalizePhone(form.owner_phone),
        email: form.owner_email || null,
        address: form.owner_address || null,
        created_by: profile?.id ?? null,
      })
      if (error) { toast.error(error); return null }
      return data
    }
    return null
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const ok = await validate()
    if (!ok) return
    setLoading(true)
    setErrors({})

    const customer = await resolveCustomer()
    if (!customer) { setLoading(false); return }

    const brandParts = form.brand_model.trim().split(/\s+/)
    const vehiclePayload = {
      customer_id: customer.id,
      brand: brandParts[0] || '',
      model: brandParts.slice(1).join(' ') || '',
      color: form.color,
      license_plate: form.license_plate || null,
      model_year: form.model_year ? parseInt(form.model_year, 10) : null,
      mileage_km: form.mileage ? parseInt(form.mileage, 10) : null,
      fuel_type: form.fuel_type,
      vin: form.vin || null,
    }

    const { data: vehicle, error: vErr } = await createVehicle(vehiclePayload)
    if (vErr) { toast.error(vErr); setLoading(false); return }
    if (!vehicle) { toast.error(t('error')); setLoading(false); return }

    // Always ask the DB for a fresh number at save time (avoids stale/duplicate numbers)
    const gen = await generateJobNumber('GAR')
    const jobNumberToUse = gen.number || jobNumber || `GAR-${new Date().getFullYear()}-0001`

    const jobPayload = {
      job_number: jobNumberToUse,
      customer_id: customer.id,
      vehicle_id: vehicle.id,
      reported_problem: form.reported_problem,
      entry_date: form.entry_date,
      expected_completion_date: form.expected_completion || null,
      status: 'received' as const,
      priority: form.priority,
      assigned_mechanic: form.assigned_mechanic || null,
      initial_diagnosis: form.initial_diagnosis || null,
      photos: [] as string[],
      notes: form.notes || null,
    }

    const { data: job, error: jErr } = await createJob(jobPayload)
    if (jErr) { toast.error(jErr); setLoading(false); return }
    if (!job) { toast.error(t('error')); setLoading(false); return }

    // Save reception-time tasks and parts (best effort; a single invalid row doesn't block)
    for (const tk of tasks) {
      if (!tk.name.trim()) continue
      const { error: tErr } = await addTask(job.id, tk.name.trim(), parseFloat(tk.price || '0') || 0)
      if (tErr) toast.error(tErr)
    }
    for (const p of parts) {
      if (!p.name.trim()) continue
      const { error: pErr } = await addJobPart(job.id, {
        spare_part_id: null,
        part_name: p.name.trim(),
        quantity: parseInt(p.qty || '1', 10) || 1,
        unit_price: parseFloat(p.price || '0') || 0,
      })
      if (pErr) toast.error(pErr)
    }

    await changeStatus(job.id, 'received', 'Véhicule réceptionné et enregistré.', profile?.id ?? null)

    setLoading(false)
    setSuccess({ saved: true, jobNumber: job.job_number, jobId: job.id })
    toast.success(`${t('regSuccess')} — ${job.job_number}`)
  }

  if (success) {
    return (
      <div className="main p-6 max-w-2xl">
        <Card className="border-garage-success/20 bg-garage-success/5">
          <div className="p-6 flex items-start gap-3">
            <CheckCircle className="w-8 h-8 text-garage-success shrink-0 mt-0.5" />
            <div>
              <h2 className="text-lg font-bold text-garage-text">{t('regSuccess')}</h2>
              <p className="text-garage-text-muted">
                {t('regSuccessJob')} <span className="font-mono font-bold text-garage-orange">{success.jobNumber}</span>.
              </p>
            </div>
          </div>
          <div className="p-6 flex flex-col sm:flex-row gap-2 sm:justify-end">
            <Button onClick={() => navigate(`/job/${success.jobId}`)}>Voir le détail de la réparation</Button>
            <Button variant="secondary" onClick={() => {
              setSuccess(null)
              setForm(EMPTY_FORM)
              setSelectedCustomer(null)
              setCustomerSearch('')
              setClientMode('existing')
              generateJobNumber('GAR').then(({ number }) => number && setJobNumber(number))
            }}>{t('navRegister')}</Button>
          </div>
        </Card>
      </div>
    )
  }

  return (
    <div className="main p-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-garage-text">{t('regTitle')}</h1>
          <p className="text-garage-text-muted text-sm">{t('regSubtitle')}</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="info">{jobNumber}</Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Customer */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2"><User className="w-4 h-4" /> Client</CardTitle>
            <CardSubtitle>{t('custSelectReturning')}</CardSubtitle>
          </CardHeader>
          <div className="p-4 space-y-3">
            {/* Mode toggle: existing (default) vs new client */}
            <div className="flex bg-gray-100 rounded-lg p-1">
              <button
                type="button"
                onClick={() => setClientMode('existing')}
                className={cn('flex-1 px-3 py-2 text-sm rounded-md font-medium transition-colors',
                  clientMode === 'existing' ? 'bg-white shadow text-garage-text' : 'text-gray-500')}
              >
                Client existant
              </button>
              <button
                type="button"
                onClick={() => setClientMode('new')}
                className={cn('flex-1 px-3 py-2 text-sm rounded-md font-medium transition-colors',
                  clientMode === 'new' ? 'bg-white shadow text-garage-text' : 'text-gray-500')}
              >
                Nouveau client
              </button>
            </div>
            {clientMode === 'existing' ? (
              <div className="space-y-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    value={customerSearch}
                    onChange={(e) => { setCustomerSearch(e.target.value); handleCustomerSearch(e.target.value) }}
                    placeholder="Chercher un client (nom ou téléphone)"
                    className="pl-9"
                  />
                </div>
                {customers.length > 0 && !selectedCustomer && (
                  <div className="bg-white border border-garage-border rounded-lg max-h-60 overflow-y-auto z-10">
                    {customers.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => selectCustomer(c)}
                        className="w-full text-left px-3 py-2.5 text-sm hover:bg-gray-50 border-b last:border-b-0"
                      >
                        <div className="font-medium text-garage-text">{c.full_name}</div>
                        <div className="text-xs text-garage-text-muted">{normalizePhone(c.phone)}</div>
                      </button>
                    ))}
                  </div>
                )}
                {selectedCustomer && (
                  <div className="p-3 bg-garage-blue-light rounded-lg border border-garage-blue/20">
                    <div className="font-medium text-garage-blue">{selectedCustomer.full_name}</div>
                    <div className="text-xs text-garage-text-muted mt-0.5">{normalizePhone(selectedCustomer.phone)}</div>
                    <button type="button" onClick={() => { setSelectedCustomer(null); setCustomerSearch(''); setForm((f)=>({...f, owner_name:'',owner_phone:'',owner_email:'',owner_address:''})) }} className="text-xs text-garage-orange underline mt-1">Changer de client</button>
                  </div>
                )}
                {customerSearch.trim() && !selectedCustomer && customers.length === 0 && (
                  <p className="text-xs text-garage-text-muted">Aucun client trouvé — utilisez « Nouveau client » ci-dessus.</p>
                )}
                {errors.customer && <p className="text-xs text-red-600">{errors.customer}</p>}
                <p className="text-xs text-garage-text-muted">La nouvelle réparation sera ajoutée au dossier du même client.</p>
              </div>
            ) : (
              <div className="space-y-3">
                <Input label="Nom complet" value={form.owner_name} onChange={(e) => setForm({...form, owner_name: e.target.value})} />
                <Input label="Téléphone" placeholder="+216 22 112 233" value={form.owner_phone} onChange={(e) => setForm({...form, owner_phone: e.target.value})} error={errors.owner_phone} />
                <Input label="E-mail" value={form.owner_email} onChange={(e) => setForm({...form, owner_email: e.target.value})} />
                <Input label="Adresse" value={form.owner_address} onChange={(e) => setForm({...form, owner_address: e.target.value})} />
                <div className="flex gap-2">
                  <Button variant="secondary" size="sm" onClick={() => setClientMode('existing')}>Rechercher un existant</Button>
                  <Button size="sm" onClick={async () => {
                    const c = await resolveCustomer()
                    if (c) selectCustomer(c)
                  }}>Créer le client</Button>
                </div>
              </div>
            )}
          </div>
        </Card>

        {/* Vehicle */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2"><Hash className="w-4 h-4" /> Véhicule</CardTitle>
          </CardHeader>
          <div className="p-4 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input label={t('regBrandModel')} placeholder={t('regBrandModelPlaceholder')} value={form.brand_model} onChange={(e) => setForm({...form, brand_model: e.target.value})} error={errors.brand_model} />
              <Input label={t('regColor')} value={form.color} onChange={(e) => setForm({...form, color: e.target.value})} error={errors.color} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Input label={t('regLicensePlate')} placeholder="123 TUN 45" value={form.license_plate} onChange={(e) => setForm({...form, license_plate: e.target.value})} />
              <Input label={t('regModelYear')} type="number" value={form.model_year} onChange={(e) => setForm({...form, model_year: e.target.value})} />
              <Input label={t('regMileage')} type="number" placeholder="km" value={form.mileage} onChange={(e) => setForm({...form, mileage: e.target.value})} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Select label={t('regFuelType')} value={form.fuel_type} onChange={(e) => setForm({...form, fuel_type: e.target.value as any})}>
                {FUEL_TYPES.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
              </Select>
              <Input label={t('regVIN')} placeholder="VIN (optionnel)" value={form.vin} onChange={(e) => setForm({...form, vin: e.target.value})} />
            </div>
          </div>
        </Card>

        {/* Repair job */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2"><Truck className="w-4 h-4" /> Réparation</CardTitle>
          </CardHeader>
          <div className="p-4 space-y-4">
            <Textarea label={t('regReportedProblem')} rows={3} value={form.reported_problem} onChange={(e) => setForm({...form, reported_problem: e.target.value})} error={errors.reported_problem} />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input label={t('regInitialDiagnosis')} placeholder="Diagnostic du mécanicien" value={form.initial_diagnosis} onChange={(e) => setForm({...form, initial_diagnosis: e.target.value})} />
              <Select label={t('regPriority')} value={form.priority} onChange={(e) => setForm({...form, priority: e.target.value as any})}>
                {PRIORITIES.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
              </Select>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input label={t('regAssignedMechanic')} placeholder="Nom du mécanicien" value={form.assigned_mechanic} onChange={(e) => setForm({...form, assigned_mechanic: e.target.value})} />
              <Input label={t('regExpectedCompletion')} type="datetime-local" value={form.expected_completion} onChange={(e) => setForm({...form, expected_completion: e.target.value})} />
            </div>
            <Input label={t('regEntryDate')} type="datetime-local" value={form.entry_date} onChange={(e) => setForm({...form, entry_date: e.target.value})} error={errors.entry_date} />
            <Textarea label={t('regNotes')} rows={2} placeholder="Notes supplémentaires" value={form.notes} onChange={(e) => setForm({...form, notes: e.target.value})} />

            {/* Tasks / labor entered at reception */}
            <div className="pt-2 border-t border-garage-border">
              <div className="flex items-center gap-2 mb-3 text-sm font-medium"><Wrench className="w-4 h-4" /> Tâches / main-d'œuvre</div>
              {tasks.length > 0 && (
                <div className="space-y-2 mb-3">
                  {tasks.map((tk, i) => (
                    <div key={i} className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-2">
                      <span className="text-sm text-garage-text flex-1">{tk.name}</span>
                      <span className="text-sm font-medium text-garage-text">{formatMoney(parseFloat(tk.price || '0'))}</span>
                      <button type="button" onClick={() => setTasks(tasks.filter((_, j) => j !== i))} className="text-garage-danger hover:bg-garage-danger-light rounded p-1">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <div className="flex flex-col sm:flex-row sm:items-end gap-1 sm:gap-2">
                <div className="w-full sm:flex-1 sm:min-w-0">
                  <Input label="Tâche" placeholder="Ex. Vidange" value={taskDraft.name}
                    onChange={(e) => setTaskDraft({ ...taskDraft, name: e.target.value })} className="w-full" />
                </div>
                <div className="w-1/2 sm:w-28">
                  <Input label="Prix (TND)" type="number" placeholder="0" value={taskDraft.price}
                    onChange={(e) => setTaskDraft({ ...taskDraft, price: e.target.value })} className="w-full" />
                </div>
                <Button variant="primary" size="sm" className="w-full sm:w-auto h-10 px-4 shrink-0" onClick={() => {
                  if (!taskDraft.name.trim()) { toast.error('Écrivez d\'abord la tâche.'); return }
                  setTasks([...tasks, { name: taskDraft.name.trim(), price: taskDraft.price || '0' }])
                  setTaskDraft({ name: '', price: '' })
                }}><Plus className="w-4 h-4 mr-1 sm:mr-0" /> Ajouter</Button>
              </div>
            </div>

            {/* Spare parts entered at reception */}
            <div className="pt-2 border-t border-garage-border">
              <div className="flex items-center gap-2 mb-3 text-sm font-medium"><FileText className="w-4 h-4" /> Pièces & fournitures</div>
              {parts.length > 0 && (
                <div className="space-y-2 mb-3">
                  {parts.map((p, i) => (
                    <div key={i} className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-2">
                      <span className="text-sm text-garage-text flex-1">{p.name}</span>
                      <span className="text-xs text-garage-text-muted">×{p.qty || 1}</span>
                      <span className="text-sm font-medium text-garage-text">{formatMoney(parseFloat(p.price || '0') * (parseInt(p.qty || '1', 10) || 1))}</span>
                      <button type="button" onClick={() => setParts(parts.filter((_, j) => j !== i))} className="text-garage-danger hover:bg-garage-danger-light rounded p-1">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <div className="flex flex-col sm:flex-row sm:items-end gap-1 sm:gap-2">
                <div className="w-full sm:flex-1 sm:min-w-0">
                  <Input label="Pièce" placeholder="Ex. Filtre à huile" value={partDraft.name}
                    onChange={(e) => setPartDraft({ ...partDraft, name: e.target.value })} className="w-full" />
                </div>
                <div className="flex gap-2">
                  <div className="w-1/3 sm:w-20">
                    <Input label="Qté" type="number" placeholder="1" value={partDraft.qty}
                      onChange={(e) => setPartDraft({ ...partDraft, qty: e.target.value })} className="w-full" />
                  </div>
                  <div className="flex-1 sm:w-40 sm:shrink-0">
                    <Input label="Prix unitaire (TND)" type="number" placeholder="0" value={partDraft.price}
                      onChange={(e) => setPartDraft({ ...partDraft, price: e.target.value })} className="w-full" />
                  </div>
                </div>
                <Button variant="primary" size="sm" className="w-full sm:w-auto h-10 px-4 shrink-0" onClick={() => {
                  if (!partDraft.name.trim()) { toast.error('Écrivez d\'abord la pièce.'); return }
                  setParts([...parts, { name: partDraft.name.trim(), qty: partDraft.qty || '1', price: partDraft.price || '0' }])
                  setPartDraft({ name: '', qty: '', price: '' })
                }}><Plus className="w-4 h-4 mr-1 sm:mr-0" /> Ajouter</Button>
              </div>
            </div>

          </div>
        </Card>
      </div>

      <div className="mt-4 sticky bottom-0 z-10 bg-gradient-to-t from-garage-bg via-garage-bg/95 to-transparent pt-3 pb-2 flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
        <Button variant="secondary" onClick={() => setForm(EMPTY_FORM)} className="w-full sm:w-auto">{t('reset')}</Button>
        <Button onClick={handleSubmit} disabled={loading} className="w-full sm:w-auto sm:px-8">
          {loading ? t('saving') : t('save')}
        </Button>
      </div>
    </div>
  )
}
