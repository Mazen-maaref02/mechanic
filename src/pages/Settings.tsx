import { useEffect, useState } from 'react'
import { Card, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/input'
import { useToastMsg } from '@/components/ui/toaster'
import { getSettings, updateSettings, listProfiles } from '@/lib/db'
import { useT } from '@/lib/i18n'
import { Settings as SettingsIcon, Users, Download } from 'lucide-react'

function cn(...classes: (string | boolean | undefined | null)[]): string {
  return classes.filter(Boolean).join(' ')
}

const LANGUAGES = [
  { value: 'fr', label: 'Français' },
  { value: 'ar', label: 'العربية (à venir)' },
  { value: 'en', label: 'English (à venir)' },
]

export default function Settings() {
  const toast = useToastMsg()
  const t = useT()
  const [settings, setSettings] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [users, setUsers] = useState<any[]>([])
  const [draft, setDraft] = useState<any>({})

  useEffect(() => {
    load()
  }, [])

  async function load() {
    setLoading(true)
    const [sRes, uRes] = await Promise.all([getSettings(), listProfiles()])
    if (sRes.error) { toast.error(sRes.error); setLoading(false); return }
    if (uRes.error) { toast.error(uRes.error); setLoading(false); return }
    setSettings(sRes.data || {})
    setDraft({
      name: (sRes.data?.name || ''),
      address: (sRes.data?.address || ''),
      phone: (sRes.data?.phone || ''),
      email: (sRes.data?.email || ''),
      currency: (sRes.data?.currency || 'TND'),
      language: (sRes.data?.language || 'fr'),
      logo_url: (sRes.data?.logo_url || ''),
      invoice_footer: (sRes.data?.invoice_footer || ''),
      invoice_number_prefix: (sRes.data?.invoice_number_prefix || 'FACT'),
      job_number_prefix: (sRes.data?.job_number_prefix || 'GAR'),
    })
    setUsers(uRes.data || [])
    setLoading(false)
  }

  async function handleSave() {
    setSaving(true)
    const { error } = await updateSettings({
      name: draft.name,
      logo_url: draft.logo_url || null,
      address: draft.address || null,
      phone: draft.phone || null,
      email: draft.email || null,
      currency: draft.currency,
      language: draft.language,
      invoice_footer: draft.invoice_footer || null,
      invoice_number_prefix: draft.invoice_number_prefix || 'FACT',
      job_number_prefix: draft.job_number_prefix || 'GAR',
    })
    setSaving(false)
    if (error) { toast.error(error); return }
    toast.success('Paramètres enregistrés.')
    setSettings((prev: any) => ({ ...(prev || {}), ...draft }))
  }

  if (!settings) return <div className="main p-6 flex items-center justify-center min-h-[60vh]">{t('loading')}</div>

  return (
    <div className="main p-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-garage-text">{t('setTitle')}</h1>
          <p className="text-garage-text-muted text-sm">{t('setSubtitle')}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2"><SettingsIcon className="w-4 h-4" /> Informations du garage</CardTitle>
          </CardHeader>
          <div className="p-6 space-y-4">
            <Input label="Nom du garage" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input label="Adresse" value={draft.address} onChange={(e) => setDraft({ ...draft, address: e.target.value })} />
              <Input label="Téléphone" value={draft.phone} onChange={(e) => setDraft({ ...draft, phone: e.target.value })} />
            </div>
            <Input label="E-mail" value={draft.email} onChange={(e) => setDraft({ ...draft, email: e.target.value })} />
            <Input label="URL du logo (affiché sur les factures)" value={draft.logo_url || ''} onChange={(e) => setDraft({ ...draft, logo_url: e.target.value })} placeholder="https://exemple.com/logo.png" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Select label="Devise" value={draft.currency} onChange={(e) => setDraft({ ...draft, currency: e.target.value })}>
                <option value="TND">TND (Dinar tunisien)</option>
                <option value="EUR">EUR</option>
                <option value="USD">USD</option>
              </Select>
              <Select label="Langue par défaut" value={draft.language} onChange={(e) => setDraft({ ...draft, language: e.target.value })}>
                {LANGUAGES.map((l) => <option key={l.value} value={l.value}>{l.label}</option>)}
              </Select>
            </div>
            <div className="pt-4 border-t border-garage-border">
              <label className="block text-xs text-garage-text-muted mb-1">Pied de facture</label>
              <Input value={draft.invoice_footer} onChange={(e) => setDraft({ ...draft, invoice_footer: e.target.value })} placeholder="Merci de votre confiance." />
            </div>
            <div className="pt-4 border-t border-garage-border grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input label="Préfixe de facture" value={draft.invoice_number_prefix} onChange={(e) => setDraft({ ...draft, invoice_number_prefix: e.target.value })} />
              <Input label="Préfixe n° réparation" value={draft.job_number_prefix} onChange={(e) => setDraft({ ...draft, job_number_prefix: e.target.value })} />
            </div>
            <Button onClick={handleSave} disabled={saving} className="w-auto">
              {saving ? 'Enregistrement...' : 'Enregistrer les paramètres'}
            </Button>
          </div>
        </Card>

        <div className="lg:col-span-1 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2"><Users className="w-4 h-4" /> Utilisateurs et rôles</CardTitle>
            </CardHeader>
            <div className="p-4 space-y-3">
              <div className="text-xs text-garage-text-muted">Rôles : administrateur, mécanicien, réceptionniste.</div>
              {users.length ? (
                <ul className="space-y-2">
                  {users.map((u) => (
                    <li key={u.id} className="flex items-center justify-between text-sm">
                      <span className="text-garage-text">{u.full_name || u.email}</span>
                      <span className="text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded">{u.role}</span>
                    </li>
                  ))}
                </ul>
              ) : <div className="text-garage-text-muted text-sm text-center py-3">Aucun utilisateur.</div>}
            </div>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2"><Download className="w-4 h-4" /> Sauvegarde et export</CardTitle>
            </CardHeader>
            <div className="p-4 space-y-3">
              <p className="text-xs text-garage-text-muted">Exportez les données du garage en CSV. La sauvegarde complète de la base se fait depuis votre projet Supabase.</p>
              <Button variant="secondary" className="w-full" disabled>Exporter toutes les données (CSV)</Button>
              <Button variant="secondary" className="w-full" disabled>Effectuer une sauvegarde</Button>
            </div>
          </Card>
        </div>
      </div>

      <div className="mt-8 text-xs text-garage-text-muted space-y-1">
        <p>• Personnalisez le nom, le logo et les couleurs dans <code>src/index.css</code> (variables --color-garage-orange, --color-garage-charcoal) et <code>src/lib/i18n.ts</code>.</p>
        <p>• Le logo s'affiche sur les factures s'il est configuré (URL/image dans garage_settings).</p>
      </div>
    </div>
  )
}
