import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { Card, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { useToastMsg } from '@/components/ui/toaster'
import { getJobs, isMaintenanceStatus, statusLabel } from '@/lib/db'
import { normalizePhone, formatDateTime } from '@/lib/utils'
import { useT } from '@/lib/i18n'
import { Search, Filter, Wrench, Car, Clock, Phone as PhoneIcon, MapPin, ChevronRight } from 'lucide-react'

function cn(...classes: (string | boolean | undefined | null)[]): string {
  return classes.filter(Boolean).join(' ')
}

const MAINTENANCE_STATUSES = [
  { value: 'received', label: 'Réceptionné' },
  { value: 'awaiting_diagnosis', label: 'Attente diagnostic' },
  { value: 'awaiting_approval', label: 'Attente validation' },
  { value: 'awaiting_parts', label: 'Attente pièces' },
  { value: 'under_repair', label: 'En réparation' },
  { value: 'testing', label: 'Contrôle qualité' },
]

export default function Maintenance() {
  const { role } = useAuth()
  const navigate = useNavigate()
  const toast = useToastMsg()
  const t = useT()
  const [jobs, setJobs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [sort, setSort] = useState<'entry_date' | 'job_number' | 'status'>('entry_date')

  useEffect(() => {
    load()
  }, [search, statusFilter, sort])

  async function load() {
    setLoading(true)
    const statuses = statusFilter ? [statusFilter as any] : undefined
    const { data, error } = await getJobs({
      status: statuses,
      search: search || undefined,
      sortBy: sort,
      sortDir: 'asc',
    })
    if (error) { toast.error(error); setLoading(false); return }
    const maint = (data || []).filter((j: any) => isMaintenanceStatus(j.status))
    setJobs(maint)
    setLoading(false)
  }

  const statusColor: Record<string, string> = {
    received: 'info', awaiting_diagnosis: 'warning', awaiting_approval: 'warning',
    awaiting_parts: 'default', under_repair: 'blue', testing: 'default',
  }

  return (
    <div className="main p-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-garage-text">{t('maintTitle')}</h1>
          <p className="text-garage-text-muted text-sm">{t('maintSubtitle')}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => navigate('/register')}>
            <Car className="w-4 h-4 mr-1.5" /> {t('navRegister')}
          </Button>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-4 mb-6">
        <div className="flex-1 min-w-[280px] relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('maintSearchPlaceholder')}
            className="pl-9"
          />
        </div>
        <div className="flex-1 min-w-[200px]">
          <Select label={t('maintStatus')} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="">Tous les statuts</option>
            {MAINTENANCE_STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
          </Select>
        </div>
        <div className="flex-1 min-w-[180px]">
          <Select label="Trier par" value={sort} onChange={(e) => setSort(e.target.value as any)}>
            <option value="entry_date">Entrée (ancien → récent)</option>
            <option value="job_number">N° réparation</option>
            <option value="status">Statut</option>
          </Select>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center min-h-[60vh]">{t('loading')}</div>
      ) : jobs.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 mb-4">
            <Wrench className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-semibold text-garage-text">{t('maintNoCars')}</h3>
          <p className="text-garage-text-muted text-sm mt-2">Aucun véhicule n\'est actuellement en maintenance.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {jobs.map((job) => (
            <Card key={job.id} className="cursor-pointer hover:shadow-card-hover transition-shadow group" onClick={() => navigate(`/job/${job.id}`)}>
              <div className="p-4">
                <div className="flex justify-between items-start mb-2">
                  <span className="font-mono text-xs font-bold text-garage-orange">{job.job_number}</span>
                  <Badge variant={statusColor[job.status] as any} className="text-[10px]">{statusLabel(job.status)}</Badge>
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
                <div className="mb-3">
                  <div className="text-xs text-garage-text-muted uppercase tracking-wider mb-1">Problème signalé</div>
                  <div className="text-sm text-garage-text line-clamp-2">{job.reported_problem}</div>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs text-garage-text-muted">
                  <div>
                    <div className="text-gray-400">Mécanicien</div>
                    <div>{job.assigned_mechanic || '—'}</div>
                  </div>
                  <div>
                    <div className="text-gray-400">Entrée</div>
                    <div>{formatDateTime(job.entry_date)}</div>
                  </div>
                  <div>
                    <div className="text-gray-400">Fin prévue</div>
                    <div>{job.expected_completion_date ? formatDateTime(job.expected_completion_date) : '—'}</div>
                  </div>
                </div>
              </div>
              <div className="border-t border-garage-border bg-gray-50 px-4 py-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-garage-text-muted">Ouvrir le détail</span>
                  <ChevronRight className="w-4 h-4 text-gray-400" />
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
