import { useEffect, useState } from 'react'
import { Card, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input, Select } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { useToastMsg } from '@/components/ui/toaster'
import {
  getInventory, createSparePart, updateSparePart, deleteSparePart, adjustStock,
  getStockMovements,
} from '@/lib/db'
import { formatMoney } from '@/lib/currency'
import { useT } from '@/lib/i18n'
import { Search, Package, Plus, Trash2, RefreshCw, History } from 'lucide-react'

function cn(...classes: (string | boolean | undefined | null)[]): string {
  return classes.filter(Boolean).join(' ')
}

export default function PartsStock() {
  const toast = useToastMsg()
  const t = useT()
  const [parts, setParts] = useState<any[]>([])
  const [movements, setMovements] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [adding, setAdding] = useState(false)
  const [adjusting, setAdjusting] = useState<string | null>(null)
  const [newPart, setNewPart] = useState({ name: '', reference: '', quantity: '0', purchase_price: '0', selling_price: '0', min_stock: '5' })
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    load()
  }, [search])

  async function load() {
    setLoading(true)
    const [pRes, mRes] = await Promise.all([getInventory(), getStockMovements()])
    if (pRes.error) { toast.error(pRes.error); setLoading(false); return }
    if (mRes.error) { toast.error(mRes.error); setLoading(false); return }
    let list = pRes.data || []
    if (search.trim()) {
      const q = search.trim().toLowerCase()
      list = list.filter((p) => p.name.toLowerCase().includes(q) || (p.reference || '').toLowerCase().includes(q))
    }
    setParts(list)
    setMovements(mRes.data || [])
    setLoading(false)
  }

  async function handleAdd() {
    setErrors({})
    if (!newPart.name.trim()) { setErrors({ name: 'Nom requis' }); return }
    const { data, error } = await createSparePart({
      name: newPart.name,
      reference: newPart.reference || null,
      quantity: parseInt(newPart.quantity, 10) || 0,
      purchase_price: parseFloat(newPart.purchase_price) || 0,
      selling_price: parseFloat(newPart.selling_price) || 0,
      min_stock: parseInt(newPart.min_stock, 10) || 5,
    })
    if (error) { toast.error(error); return }
    toast.success('Pièce ajoutée.')
    setAdding(false)
    setNewPart({ name: '', reference: '', quantity: '0', purchase_price: '0', selling_price: '0', min_stock: '5' })
    load()
  }

  async function handleSave(id: string, draft: any) {
    const { error } = await updateSparePart(id, {
      name: draft.name,
      reference: draft.reference || null,
      quantity: parseInt(draft.quantity, 10) || 0,
      purchase_price: parseFloat(draft.purchase_price) || 0,
      selling_price: parseFloat(draft.selling_price) || 0,
      min_stock: parseInt(draft.min_stock, 10) || 5,
    })
    if (error) { toast.error(error); return }
    toast.success('Pièce mise à jour.')
    load()
  }

  async function handleDelete(id: string) {
    if (!window.confirm('Supprimer cette pièce ?')) return
    const { error } = await deleteSparePart(id)
    if (error) { toast.error(error); return }
    toast.success('Pièce supprimée.')
    load()
  }

  async function handleAdjust(id: string, currentQty: number) {
    const delta = window.prompt(`Quantité actuelle: ${currentQty}\nEntrez la variation (ex: +5 ou -2):`)
    if (delta === null) return
    const d = parseInt(delta, 10)
    if (isNaN(d)) { toast.error('Nombre invalide.'); return }
    const reason = window.prompt('Motif de l\'ajustement:')
    if (reason === null) return
    const { error } = await adjustStock(id, d, reason, null)
    if (error) { toast.error(error); return }
    toast.success('Stock ajusté.')
    load()
  }

  function lowStock(p: any) { return p.quantity <= p.min_stock }

  if (loading) return <div className="main p-6 flex items-center justify-center min-h-[60vh]">{t('loading')}</div>

  return (
    <div className="main p-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-garage-text">{t('partsTitle')}</h1>
          <p className="text-garage-text-muted text-sm">{t('partsSubtitle')}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={() => setAdding(true)}><Plus className="w-4 h-4 mr-2" /> {t('partsAddPart')}</Button>
        </div>
      </div>

      {adding && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-sm">Nouvelle pièce</CardTitle>
          </CardHeader>
          <div className="p-4 grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Input label="Nom" value={newPart.name} onChange={(e) => setNewPart({...newPart, name: e.target.value})} error={errors.name} />
            <Input label="Référence" value={newPart.reference} onChange={(e) => setNewPart({...newPart, reference: e.target.value})} />
            <Input label="Qté" type="number" value={newPart.quantity} onChange={(e) => setNewPart({...newPart, quantity: e.target.value})} className="sm:col-span-1" />
            <Input label="Prix achat (TND)" type="number" value={newPart.purchase_price} onChange={(e) => setNewPart({...newPart, purchase_price: e.target.value})} />
            <Input label="Prix vente (TND)" type="number" value={newPart.selling_price} onChange={(e) => setNewPart({...newPart, selling_price: e.target.value})} />
            <Input label="Stock min" type="number" value={newPart.min_stock} onChange={(e) => setNewPart({...newPart, min_stock: e.target.value})} />
            <div className="sm:col-span-3 flex gap-2">
              <Button variant="secondary" onClick={() => setAdding(false)}>Annuler</Button>
              <Button onClick={handleAdd}>Ajouter</Button>
            </div>
          </div>
        </Card>
      )}

      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t('partsSearchPlaceholder')} className="pl-9 w-full max-w-md" />
      </div>

      <div className="overflow-x-auto">
        <table className="table">
          <thead>
            <tr>
              <th>{t('partsName')}</th>
              <th>{t('partsReference')}</th>
              <th className="text-right">{t('partsQuantity')}</th>
              <th className="text-right">{t('partsSellingPrice')}</th>
              <th className="text-right">{t('partsPurchasePrice')}</th>
              <th>{t('partsInStock')}</th>
              <th className="text-right">{t('actions')}</th>
            </tr>
          </thead>
          <tbody>
            {parts.length ? parts.map((p) => (
              <tr key={p.id} className={`table-row ${lowStock(p) ? 'bg-garage-danger-light/30' : ''}`}>
                <td className="font-medium">
                  {p.name} {lowStock(p) && <span className="ml-2 text-garage-danger font-bold text-xs">{t('partsLowStock')}</span>}
                </td>
                <td className="text-sm text-garage-text-muted">{p.reference || '—'}</td>
                <td className="text-sm text-right">{p.quantity}</td>
                <td className="text-sm text-right">{formatMoney(p.selling_price)}</td>
                <td className="text-sm text-right">{formatMoney(p.purchase_price)}</td>
                <td className="text-sm">
                  <Badge variant={lowStock(p) ? 'danger' : 'success'}>{lowStock(p) ? 'Bas' : 'OK'}</Badge>
                </td>
                <td className="text-sm text-right">
                  <div className="flex items-center justify-end gap-1">
                    <Button size="sm" variant="ghost" onClick={() => handleAdjust(p.id, p.quantity)}>Ajuster stock</Button>
                    <Button size="sm" variant="danger" onClick={() => handleDelete(p.id)}><Trash2 className="w-3 h-3" /></Button>
                  </div>
                </td>
              </tr>
            )) : (
              <tr><td colSpan={7} className="text-center text-garage-text-muted py-4">{t('partsNoParts')}</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-8">
        <div className="flex items-center gap-2 mb-3">
          <History className="w-4 h-4" />
          <h2 className="text-sm font-bold text-garage-text">Mouvements de stock</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="table">
            <thead>
              <tr>
                <th>Pièce</th>
                <th>Type</th>
                <th className="text-right">Qté</th>
                <th>Motif</th>
                <th className="text-right">Date</th>
              </tr>
            </thead>
            <tbody>
              {movements.slice(0, 20).map((m) => {
                const part = parts.find((p) => p.id === m.spare_part_id)
                return (
                  <tr key={m.id} className="table-row">
                    <td className="text-sm">{part ? part.name : '—'}</td>
                    <td className="text-sm">
                      <Badge variant={m.type === 'in' ? 'success' : m.type === 'out' ? 'danger' : 'default'} className="text-[10px]">{m.type}</Badge>
                    </td>
                    <td className="text-sm text-right">{m.quantity}</td>
                    <td className="text-sm text-garage-text-muted">{m.reason || '—'}</td>
                    <td className="text-sm text-right text-garage-text-muted">{new Date(m.created_at).toLocaleString('fr-TN')}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
