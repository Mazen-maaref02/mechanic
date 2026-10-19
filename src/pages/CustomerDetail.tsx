import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Card, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { useToastMsg } from '@/components/ui/toaster'
import { getCustomers, updateCustomer, deleteCustomer, getJobs, getVehicles } from '@/lib/db'
import { normalizePhone, formatDateTime } from '@/lib/utils'
import { formatMoney } from '@/lib/currency'
import { useT } from '@/lib/i18n'
import { Phone as PhoneIcon, User, Car, CarFront, Wrench, FileText, ArrowLeft, Trash2, Save, Edit } from 'lucide-react'

function cn(...classes: (string | boolean | undefined | null)[]): string {
  return classes.filter(Boolean).join(' ')
}

export default function CustomerDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const toast = useToastMsg()
  const t = useT()
  const [customer, setCustomer] = useState<any>(null)
  const [vehicles, setVehicles] = useState<any[]>([])
  const [jobs, setJobs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState<any>({})

  useEffect(() => {
    if (!id) return
    setLoading(true)
    Promise.all([getCustomers(), getVehicles(id), getJobs({ customerId: id })]).then(([cRes, vRes, jRes]) => {
      if (cRes.error) { toast.error(cRes.error); setLoading(false); return }
      const cust = (cRes.data || []).find((c: any) => c.id === id)
      setCustomer(cust || null)
      setDraft({ ...cust })
      setVehicles(vRes.data || [])
      setJobs(jRes.data || [])
      setLoading(false)
    })
  }, [id])

  async function handleSave() {
    if (!draft.full_name || !draft.phone) { toast.error('Nom et téléphone requis.'); return }
    const { error } = await updateCustomer(id!, { full_name: draft.full_name, phone: draft.phone, email: draft.email || null, address: draft.address || null })
    if (error) { toast.error(error); return }
    toast.success('Client mis à jour.')
    setEditing(false)
    const [cRes] = await Promise.all([getCustomers()])
    const cust = (cRes.data || []).find((c: any) => c.id === id)
    setCustomer(cust || null)
  }

  async function handleDelete() {
    if (!window.confirm('Supprimer ce client et ses véhicules ?')) return
    const { error } = await deleteCustomer(id!)
    if (error) { toast.error(error); return }
    toast.success('Client supprimé.')
    navigate('/customers')
  }

  if (!customer) {
    return <div className="main p-6 flex items-center justify-center min-h-[60vh]">{loading ? t('loading') : 'Client introuvable.'}</div>
  }

  const customerJobs = jobs.filter((j: any) => j.customer_id === customer.id)

  return (
    <div className="main p-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <Button variant="ghost" size="sm" onClick={() => navigate('/customers')}><ArrowLeft className="w-4 h-4 mr-2" /> Retour</Button>
          <h1 className="text-2xl font-bold text-garage-text">{customer.full_name}</h1>
          <p className="text-garage-text-muted text-sm">{t('custPhone')}: {normalizePhone(customer.phone)}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => navigate('/register', { state: { customerId: customer.id } })}>
            <CarFront className="w-4 h-4 mr-2" /> Réceptionner sa voiture
          </Button>
          <Button variant="secondary" onClick={() => setEditing(true)}><Edit className="w-4 h-4 mr-2" /> Modifier</Button>
          <Button variant="danger" onClick={handleDelete}>Supprimer</Button>
        </div>
      </div>

      {editing && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-sm">Modifier le client</CardTitle>
          </CardHeader>
          <div className="p-4 grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Input label="Nom complet" value={draft.full_name} onChange={(e) => setDraft({...draft, full_name: e.target.value})} />
            <Input label="Téléphone" placeholder="+216 22 112 233" value={draft.phone} onChange={(e) => setDraft({...draft, phone: e.target.value})} />
            <Input label="E-mail" value={draft.email} onChange={(e) => setDraft({...draft, email: e.target.value})} className="sm:col-span-2" />
            <Input label="Adresse" value={draft.address} onChange={(e) => setDraft({...draft, address: e.target.value})} className="sm:col-span-2" />
            <div className="sm:col-span-3 flex gap-2">
              <Button variant="secondary" onClick={() => { setDraft({...customer}); setEditing(false) }}>Annuler</Button>
              <Button onClick={handleSave}>Enregistrer</Button>
            </div>
          </div>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Vehicles */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2"><Car className="w-4 h-4" /> Véhicules</CardTitle>
          </CardHeader>
          <div className="p-4">
            {vehicles.length ? (
              <ul className="space-y-3">
                {vehicles.map((v) => (
                  <li key={v.id} className="p-3 bg-gray-50 rounded-lg border border-garage-border">
                    <div className="font-semibold text-garage-text">{v.brand} {v.model}</div>
                    <div className="text-sm text-garage-text-muted">{v.color || '—'} · {v.license_plate || '—'} · {v.vin || '—'}</div>
                    <div className="text-xs text-garage-text-muted mt-1">{v.fuel_type || '—'} · {v.mileage_km != null ? v.mileage_km + ' km' : '—'}</div>
                  </li>
                ))}
              </ul>
            ) : <div className="text-garage-text-muted text-sm text-center py-6">Aucun véhicule enregistré.</div>}
          </div>
        </Card>

        {/* Jobs */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2"><Wrench className="w-4 h-4" /> Réparations</CardTitle>
          </CardHeader>
          <div className="p-4">
            {customerJobs.length ? (
              <ul className="space-y-3">
                {customerJobs.map((j) => (
                  <li key={j.id} className="p-3 bg-gray-50 rounded-lg border border-garage-border">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="font-semibold text-garage-text">{j.job_number}</div>
                        <div className="text-sm text-garage-text-muted">{j.vehicle_brand} {j.vehicle_model}</div>
                      </div>
                      <Badge variant={j.status === 'finished' ? 'success' : 'info'} className="text-[10px]">{j.status}</Badge>
                    </div>
                    <div className="text-sm text-garage-text mt-1">{j.reported_problem}</div>
                    <div className="text-xs text-garage-text-muted mt-1">{formatDateTime(j.entry_date)} · {formatMoney(Number(j.amount_paid || 0))} payé</div>
                  </li>
                ))}
              </ul>
            ) : <div className="text-garage-text-muted text-sm text-center py-6">Aucune réparation.</div>}
          </div>
        </Card>
      </div>

      <div className="mt-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2"><FileText className="w-4 h-4" /> Informations</CardTitle>
          </CardHeader>
          <div className="p-4 space-y-2">
            <div className="flex items-center gap-3 text-sm">
              <PhoneIcon className="w-4 h-4 text-garage-text-muted" />
              <span>{normalizePhone(customer.phone)}</span>
            </div>
            {customer.email && <div className="flex items-center gap-3 text-sm"><User className="w-4 h-4 text-garage-text-muted" /><span>{customer.email}</span></div>}
            {customer.address && <div className="flex items-center gap-3 text-sm"><span className="w-4 h-4">📍</span><span>{customer.address}</span></div>}
            <div className="text-xs text-garage-text-muted mt-3">Créé le {formatDateTime(customer.created_at)}</div>
          </div>
        </Card>
      </div>
    </div>
  )
}
