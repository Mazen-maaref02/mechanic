import { useEffect, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Card, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { useToastMsg } from '@/components/ui/toaster'
import { getCustomers, createCustomer, updateCustomer, deleteCustomer, getJobs, getVehicles } from '@/lib/db'
import { normalizePhone, formatDateTime } from '@/lib/utils'
import { formatMoney } from '@/lib/currency'
import { useT } from '@/lib/i18n'
import { Search, User, Plus, Car, Wrench, FileText, ChevronRight, Trash2, AlertCircle, Phone as PhoneIcon } from 'lucide-react'

function cn(...classes: (string | boolean | undefined | null)[]): string {
  return classes.filter(Boolean).join(' ')
}

export default function Customers() {
  const navigate = useNavigate()
  const toast = useToastMsg()
  const t = useT()
  const [customers, setCustomers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [adding, setAdding] = useState(false)
  const [newCust, setNewCust] = useState({ full_name: '', phone: '', email: '', address: '' })
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    load()
  }, [search])

  async function load() {
    setLoading(true)
    const { data, error } = await getCustomers()
    if (error) { toast.error(error); setLoading(false); return }
    let list = data || []
    if (search.trim()) {
      const q = search.trim().toLowerCase()
      list = list.filter((c) => c.full_name.toLowerCase().includes(q) || c.phone.includes(q))
    }
    setCustomers(list)
    setLoading(false)
  }

  async function handleAdd() {
    setErrors({})
    if (!newCust.full_name.trim()) { setErrors({ full_name: 'Nom requis' }); return }
    if (!newCust.phone.trim()) { setErrors({ phone: 'Téléphone requis' }); return }
    const dup = customers.find(c => c.phone === newCust.phone)
    if (dup) { setErrors({ phone: 'Ce téléphone existe déjà' }); return }
    const { data, error } = await createCustomer({ ...newCust, created_by: null })
    if (error) { toast.error(error); return }
    toast.success('Client créé.')
    setAdding(false)
    setNewCust({ full_name: '', phone: '', email: '', address: '' })
    load()
  }

  async function handleDelete(id: string) {
    if (!window.confirm('Supprimer ce client et ses véhicules ?')) return
    const { error } = await deleteCustomer(id)
    if (error) { toast.error(error); return }
    toast.success('Client supprimé.')
    load()
  }

  return (
    <div className="main p-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-garage-text">{t('custTitle')}</h1>
          <p className="text-garage-text-muted text-sm">{t('custSubtitle')}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={() => setAdding(true)}><Plus className="w-4 h-4 mr-2" /> {t('custAddCustomer')}</Button>
        </div>
      </div>

      {adding && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-sm">Nouveau client</CardTitle>
          </CardHeader>
          <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label="Nom complet" value={newCust.full_name} onChange={(e) => setNewCust({...newCust, full_name: e.target.value})} error={errors.full_name} />
            <Input label="Téléphone" placeholder="+216 22 112 233" value={newCust.phone} onChange={(e) => setNewCust({...newCust, phone: e.target.value})} error={errors.phone} />
            <Input label="E-mail" value={newCust.email} onChange={(e) => setNewCust({...newCust, email: e.target.value})} className="sm:col-span-2" />
            <Input label="Adresse" value={newCust.address} onChange={(e) => setNewCust({...newCust, address: e.target.value})} className="sm:col-span-2" />
            <div className="sm:col-span-2 flex gap-2">
              <Button variant="secondary" onClick={() => setAdding(false)}>Annuler</Button>
              <Button onClick={handleAdd}>Enregistrer</Button>
            </div>
          </div>
        </Card>
      )}

      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t('custSearchPlaceholder')} className="pl-9 w-full max-w-md" />
      </div>

      {loading ? (
        <div className="flex items-center justify-center min-h-[60vh]">{t('loading')}</div>
      ) : customers.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 mb-4"><User className="w-8 h-8" /></div>
          <h3 className="text-lg font-semibold text-garage-text">{t('custNoCustomers')}</h3>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {customers.map((c) => (
            <Card key={c.id} className="cursor-pointer hover:shadow-card-hover transition-shadow group" onClick={() => navigate(`/customer/${c.id}`)}>
              <div className="p-4">
                <div className="flex justify-between items-start mb-2">
                  <div className="font-semibold text-garage-text">{c.full_name}</div>
                </div>
                <div className="text-xs text-garage-text-muted mb-3 flex items-center gap-1">
                  <PhoneIcon className="w-3 h-3" /> {normalizePhone(c.phone)}
                </div>
                {c.email && <div className="text-xs text-garage-text-muted mb-2">{c.email}</div>}
                {c.address && <div className="text-xs text-garage-text-muted mb-3">{c.address}</div>}
                <div className="text-xs text-garage-text-muted">Créé le {formatDateTime(c.created_at)}</div>
              </div>
              <div className="border-t border-garage-border bg-gray-50 px-4 py-3 flex justify-between">
                <span className="text-xs text-garage-text-muted">Voir les détails</span>
                <ChevronRight className="w-4 h-4 text-garage-text-muted" />
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

function s(n: number) { return n > 1 ? 's' : '' }
