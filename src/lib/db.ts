/**
 * GaragePro data access layer.
 * Wraps Supabase calls with consistent error handling.
 * All functions return { data, error }.
 */
import { supabase, isSupabaseConfigured } from './supabase'
import type {
  Customer,
  Vehicle,
  RepairJob,
  StatusHistory,
  RepairTask,
  SparePart,
  RepairPart,
  Payment,
  Invoice,
  StockMovement,
  GarageSettings,
  Profile,
  DashboardStats,
  JobTotals,
  RepairStatus,
  PaymentMethod,
} from '@/types'
import { formatDateTime } from './utils'

type DBResponse<T> = { data: T | null; error: string | null }

function notConfigured<T>(): DBResponse<T> {
  return { data: null, error: 'Supabase n\'est pas configuré. Voir .env.example et README.md.' }
}

function err(e: unknown): string {
  if (e instanceof Error) return e.message
  if (typeof e === 'string') return e
  const anyE = e as Record<string, unknown> | null
  if (anyE && typeof anyE === 'object') {
    const msg = [anyE.message, anyE.details, anyE.hint]
      .filter((x) => typeof x === 'string' && x)
      .join(' — ')
    if (msg) return msg
    try { return JSON.stringify(e) } catch { return String(e) }
  }
  return String(e)
}

/* ------------------------------------------------------------------ */
/* Settings                                                           */
/* ------------------------------------------------------------------ */
export async function getSettings(): Promise<DBResponse<GarageSettings>> {
  if (!isSupabaseConfigured) return notConfigured()
  const { data, error } = await supabase.from('garage_settings').select('*').eq('id', 1).single()
  return { data: data as GarageSettings | null, error: error ? err(error) : null }
}

export async function updateSettings(patch: Partial<GarageSettings>): Promise<DBResponse<GarageSettings>> {
  if (!isSupabaseConfigured) return notConfigured()
  const { data, error } = await supabase
    .from('garage_settings')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('id', 1)
    .select()
    .single()
  return { data: data as GarageSettings | null, error: error ? err(error) : null }
}

/* ------------------------------------------------------------------ */
/* Profiles                                                           */
/* ------------------------------------------------------------------ */
export async function getProfile(userId: string): Promise<DBResponse<Profile>> {
  if (!isSupabaseConfigured) return notConfigured()
  const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).single()
  return { data: data as Profile | null, error: error ? err(error) : null }
}

export async function listProfiles(): Promise<DBResponse<Profile[]>> {
  if (!isSupabaseConfigured) return notConfigured()
  const { data, error } = await supabase.from('profiles').select('*').order('full_name', { ascending: true })
  return { data: data as Profile[] | null, error: error ? err(error) : null }
}

/* ------------------------------------------------------------------ */
/* Auth helpers                                                       */
/* ------------------------------------------------------------------ */
export async function signIn(email: string, password: string) {
  if (!isSupabaseConfigured) return notConfigured()
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  return { data, error: error ? err(error) : null }
}

export async function signUp(email: string, password: string, fullName?: string) {
  if (!isSupabaseConfigured) return notConfigured()
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { full_name: fullName || null } },
  })
  return { data, error: error ? err(error) : null }
}

export async function signOut() {
  if (!isSupabaseConfigured) return
  await supabase.auth.signOut()
}

export async function getCurrentUser() {
  if (!isSupabaseConfigured) return null
  const { data } = await supabase.auth.getUser()
  return data.user
}

export async function getSession() {
  if (!isSupabaseConfigured) return null
  const { data } = await supabase.auth.getSession()
  return data.session
}

/* ------------------------------------------------------------------ */
/* Customers                                                          */
/* ------------------------------------------------------------------ */
export async function getCustomers(): Promise<DBResponse<Customer[]>> {
  if (!isSupabaseConfigured) return notConfigured()
  const { data, error } = await supabase.from('customers').select('*').order('full_name', { ascending: true })
  return { data: data as Customer[] | null, error: error ? err(error) : null }
}

export async function searchCustomers(q: string): Promise<DBResponse<Customer[]>> {
  if (!isSupabaseConfigured) return notConfigured()
  const { data, error } = await supabase
    .from('customers')
    .select('*')
    .or(`full_name.ilike.%${q}%,phone.ilike.%${q}%`)
    .order('full_name', { ascending: true })
    .limit(20)
  return { data: data as Customer[] | null, error: error ? err(error) : null }
}

export async function createCustomer(payload: Omit<Customer, 'id' | 'created_at' | 'updated_at'> & { created_by?: string | null }): Promise<DBResponse<Customer>> {
  if (!isSupabaseConfigured) return notConfigured()
  const now = new Date().toISOString()
  const { data, error } = await supabase
    .from('customers')
    .insert({ ...payload, created_at: now, updated_at: now })
    .select()
    .single()
  return { data: data as Customer | null, error: error ? err(error) : null }
}

export async function updateCustomer(id: string, patch: Partial<Customer>): Promise<DBResponse<Customer>> {
  if (!isSupabaseConfigured) return notConfigured()
  const { data, error } = await supabase
    .from('customers')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()
  return { data: data as Customer | null, error: error ? err(error) : null }
}

export async function deleteCustomer(id: string): Promise<DBResponse<null>> {
  if (!isSupabaseConfigured) return notConfigured()
  const { error } = await supabase.from('customers').delete().eq('id', id)
  return { data: null, error: error ? err(error) : null }
}

/* ------------------------------------------------------------------ */
/* Vehicles                                                           */
/* ------------------------------------------------------------------ */
export async function getVehicles(customerId?: string): Promise<DBResponse<Vehicle[]>> {
  if (!isSupabaseConfigured) return notConfigured()
  let q = supabase.from('vehicles').select('*').order('brand', { ascending: true })
  if (customerId) q = q.eq('customer_id', customerId)
  const { data, error } = await q
  return { data: data as Vehicle[] | null, error: error ? err(error) : null }
}

export async function createVehicle(payload: Omit<Vehicle, 'id' | 'created_at' | 'updated_at'>): Promise<DBResponse<Vehicle>> {
  if (!isSupabaseConfigured) return notConfigured()
  const now = new Date().toISOString()
  const { data, error } = await supabase
    .from('vehicles')
    .insert({ ...payload, created_at: now, updated_at: now })
    .select()
    .single()
  return { data: data as Vehicle | null, error: error ? err(error) : null }
}

/* ------------------------------------------------------------------ */
/* Job number generation                                              */
/* ------------------------------------------------------------------ */
export async function generateJobNumber(prefixArg?: string): Promise<{ number: string | null; error: string | null }> {
  if (!isSupabaseConfigured) return { number: null, error: 'Supabase non configuré.' }
  const { data: settings } = await supabase.from('garage_settings').select('job_number_prefix').eq('id', 1).single()
  const prefix = settings?.job_number_prefix || prefixArg || 'GAR'
  const year = new Date().getFullYear()
  const { data, error } = await supabase.rpc('next_job_number', { p_year: year, p_prefix: prefix })
  if (error) return { number: null, error: err(error) }
  return { number: data as string, error: null }
}

/* ------------------------------------------------------------------ */
/* Repair jobs                                                        */
/* ------------------------------------------------------------------ */
export async function getJobs({
  status,
  customerId,
  search,
  sortBy = 'entry_date',
  sortDir = 'desc',
}: {
  status?: RepairStatus | RepairStatus[]
  customerId?: string
  search?: string
  sortBy?: string
  sortDir?: 'asc' | 'desc'
} = {}): Promise<DBResponse<RepairJob[]>> {
  if (!isSupabaseConfigured) return notConfigured()
  let q = supabase
    .from('repair_jobs')
    .select(`
      *,
      customers ( full_name, phone ),
      vehicles ( brand, model, color, license_plate )
    `)
    .order(sortBy, { ascending: sortDir === 'asc' })

  if (status) {
    const statuses = Array.isArray(status) ? status : [status]
    q = q.in('status', statuses)
  }
  if (customerId) q = q.eq('customer_id', customerId)
  if (search) {
    q = q.or(
      `job_number.ilike.%${search}%,reported_problem.ilike.%${search}%,assigned_mechanic.ilike.%${search}%,notes.ilike.%${search}%,customers.full_name.ilike.%${search}%,customers.phone.ilike.%${search}%,vehicles.brand.ilike.%${search}%,vehicles.model.ilike.%${search}%,vehicles.license_plate.ilike.%${search}%`
    )
  }

  const { data, error } = await q
  return { data: data as RepairJob[] | null, error: error ? err(error) : null }
}

export async function getJob(id: string): Promise<DBResponse<RepairJob & { customer?: Customer; vehicle?: Vehicle; tasks?: RepairTask[]; parts?: RepairPart[] }>> {
  if (!isSupabaseConfigured) return notConfigured()
  const { data, error } = await supabase
    .from('repair_jobs')
    .select(`
      *,
      customers ( * ),
      vehicles ( * )
    `)
    .eq('id', id)
    .single()
  if (error) return { data: null, error: err(error) }
  const rows = await Promise.all([
    supabase.from('repair_tasks').select('*').eq('repair_job_id', id).order('created_at', { ascending: true }),
    supabase.from('repair_parts').select('*').eq('repair_job_id', id).order('created_at', { ascending: true }),
  ])
  const row = data as any
  if (row) {
    row.tasks = rows[0].data || []
    row.parts = rows[1].data || []
  }
  return { data: row, error: null }
}

export async function createJob(payload: {
  job_number: string
  customer_id: string | null
  vehicle_id: string | null
  reported_problem: string
  entry_date: string
  expected_completion_date: string | null
  status: RepairStatus
  priority: string
  assigned_mechanic: string | null
  initial_diagnosis: string | null
  photos: string[]
  notes: string | null
}): Promise<DBResponse<RepairJob>> {
  if (!isSupabaseConfigured) return notConfigured()
  const { data, error } = await supabase.from('repair_jobs').insert(payload).select().single()
  return { data: data as RepairJob | null, error: error ? err(error) : null }
}

export async function updateJob(id: string, patch: Partial<RepairJob>): Promise<DBResponse<RepairJob>> {
  if (!isSupabaseConfigured) return notConfigured()
  const { data, error } = await supabase
    .from('repair_jobs')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()
  return { data: data as RepairJob | null, error: error ? err(error) : null }
}

export async function deleteJob(id: string): Promise<DBResponse<null>> {
  if (!isSupabaseConfigured) return notConfigured()
  const { error } = await supabase.from('repair_jobs').delete().eq('id', id)
  return { data: null, error: error ? err(error) : null }
}

/* ------------------------------------------------------------------ */
/* Status transitions                                                 */
/* ------------------------------------------------------------------ */
const STATUS_LABELS: Record<RepairStatus, string> = {
  received: 'Réceptionné',
  awaiting_diagnosis: 'En attente de diagnostic',
  awaiting_approval: 'En attente de validation client',
  awaiting_parts: 'En attente de pièces',
  under_repair: 'En réparation',
  testing: 'Contrôle qualité / Essais',
  finished: 'Terminé — prêt à retirer',
  delivered: 'Livré au propriétaire',
}

export function statusLabel(status: RepairStatus): string {
  return STATUS_LABELS[status] || status
}

export function isMaintenanceStatus(status: RepairStatus): boolean {
  return status !== 'finished' && status !== 'delivered'
}

export function isFinishedStatus(status: RepairStatus): boolean {
  return status === 'finished'
}

export async function changeStatus(
  jobId: string,
  newStatus: RepairStatus,
  note: string | null,
  changedBy: string | null
): Promise<DBResponse<{ job: RepairJob; history: StatusHistory }>> {
  if (!isSupabaseConfigured) return notConfigured()
  // Fetch current job to get old status
  const { data: job, error: jErr } = await supabase.from('repair_jobs').select('status').eq('id', jobId).single()
  if (jErr) return { data: null, error: err(jErr) }
  const oldStatus = (job as RepairJob).status

  const now = new Date().toISOString()

  // Update job
  const { data: updatedJob, error: uErr } = await supabase
    .from('repair_jobs')
    .update({ status: newStatus, updated_at: now })
    .eq('id', jobId)
    .select()
    .single()
  if (uErr) return { data: null, error: err(uErr) }

  // Insert history
  const { data: history, error: hErr } = await supabase.from('status_history').insert({
    repair_job_id: jobId,
    old_status: oldStatus,
    new_status: newStatus,
    changed_by: changedBy,
    changed_at: now,
    note,
  }).select().single()
  if (hErr) return { data: null, error: err(hErr) }

  return { data: { job: updatedJob as RepairJob, history: history as StatusHistory }, error: null }
}

/* ------------------------------------------------------------------ */
/* Status history                                                     */
/* ------------------------------------------------------------------ */
export async function getStatusHistory(jobId: string): Promise<DBResponse<StatusHistory[]>> {
  if (!isSupabaseConfigured) return notConfigured()
  const { data, error } = await supabase
    .from('status_history')
    .select('*, profiles ( full_name )')
    .eq('repair_job_id', jobId)
    .order('changed_at', { ascending: false })
  return { data: data as StatusHistory[] | null, error: error ? err(error) : null }
}

/* ------------------------------------------------------------------ */
/* Repair tasks (labor)                                               */
/* ------------------------------------------------------------------ */
export async function getTasks(jobId: string): Promise<DBResponse<RepairTask[]>> {
  if (!isSupabaseConfigured) return notConfigured()
  const { data, error } = await supabase.from('repair_tasks').select('*').eq('repair_job_id', jobId).order('created_at', { ascending: true })
  return { data: data as RepairTask[] | null, error: error ? err(error) : null }
}

export async function addTask(jobId: string, taskName: string, laborPrice: number): Promise<DBResponse<RepairTask>> {
  if (!isSupabaseConfigured) return notConfigured()
  const { data, error } = await supabase
    .from('repair_tasks')
    .insert({ repair_job_id: jobId, task_name: taskName, labor_price: laborPrice })
    .select().single()
  return { data: data as RepairTask | null, error: error ? err(error) : null }
}

export async function deleteTask(id: string): Promise<DBResponse<null>> {
  if (!isSupabaseConfigured) return notConfigured()
  const { error } = await supabase.from('repair_tasks').delete().eq('id', id)
  return { data: null, error: error ? err(error) : null }
}

/* ------------------------------------------------------------------ */
/* Parts used on a job                                                */
/* ------------------------------------------------------------------ */
export async function getJobParts(jobId: string): Promise<DBResponse<RepairPart[]>> {
  if (!isSupabaseConfigured) return notConfigured()
  const { data, error } = await supabase.from('repair_parts').select('*').eq('repair_job_id', jobId).order('created_at', { ascending: true })
  return { data: data as RepairPart[] | null, error: error ? err(error) : null }
}

export async function addJobPart(
  jobId: string,
  part: { spare_part_id: string | null; part_name: string; quantity: number; unit_price: number }
): Promise<DBResponse<RepairPart>> {
  if (!isSupabaseConfigured) return notConfigured()
  // Deduct inventory if linked to a spare part
  if (part.spare_part_id) {
    const { data: sp } = await supabase.from('spare_parts').select('quantity').eq('id', part.spare_part_id).single()
    const current = (sp as SparePart | null)?.quantity ?? 0
    if (current < part.quantity) {
      return { data: null, error: 'Stock insuffisant pour cette pièce.' }
    }
    const { error: dedErr } = await supabase
      .from('spare_parts')
      .update({ quantity: current - part.quantity })
      .eq('id', part.spare_part_id)
    if (dedErr) return { data: null, error: err(dedErr) }
    await supabase.from('stock_movements').insert({
      spare_part_id: part.spare_part_id,
      type: 'out',
      quantity: part.quantity,
      reason: `Utilisé sur réparation ${jobId}`,
      created_by: null,
    })
  }

  const { data, error } = await supabase
    .from('repair_parts')
    .insert({ ...part, repair_job_id: jobId })
    .select().single()
  return { data: data as RepairPart | null, error: error ? err(error) : null }
}

export async function deleteJobPart(id: string, sparePartId: string | null, quantity: number): Promise<DBResponse<null>> {
  if (!isSupabaseConfigured) return notConfigured()
  const { error } = await supabase.from('repair_parts').delete().eq('id', id)
  if (error) return { data: null, error: err(error) }
  // Restore inventory
  if (sparePartId) {
    const { data: sp } = await supabase.from('spare_parts').select('quantity').eq('id', sparePartId).single()
    const current = (sp as SparePart | null)?.quantity ?? 0
    await supabase.from('spare_parts').update({ quantity: current + quantity }).eq('id', sparePartId)
    await supabase.from('stock_movements').insert({
      spare_part_id: sparePartId,
      type: 'in',
      quantity,
      reason: `Retour suite à suppression sur réparation`,
      created_by: null,
    })
  }
  return { data: null, error: null }
}

/* ------------------------------------------------------------------ */
/* Spare parts inventory                                              */
/* ------------------------------------------------------------------ */
export async function getInventory(): Promise<DBResponse<SparePart[]>> {
  if (!isSupabaseConfigured) return notConfigured()
  const { data, error } = await supabase.from('spare_parts').select('*').order('name', { ascending: true })
  return { data: data as SparePart[] | null, error: error ? err(error) : null }
}

export async function createSparePart(part: Omit<SparePart, 'id' | 'created_at' | 'updated_at'>): Promise<DBResponse<SparePart>> {
  if (!isSupabaseConfigured) return notConfigured()
  const now = new Date().toISOString()
  const { data, error } = await supabase
    .from('spare_parts')
    .insert({ ...part, created_at: now, updated_at: now })
    .select().single()
  return { data: data as SparePart | null, error: error ? err(error) : null }
}

export async function updateSparePart(id: string, patch: Partial<SparePart>): Promise<DBResponse<SparePart>> {
  if (!isSupabaseConfigured) return notConfigured()
  const { data, error } = await supabase
    .from('spare_parts')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select().single()
  return { data: data as SparePart | null, error: error ? err(error) : null }
}

export async function deleteSparePart(id: string): Promise<DBResponse<null>> {
  if (!isSupabaseConfigured) return notConfigured()
  const { error } = await supabase.from('spare_parts').delete().eq('id', id)
  return { data: null, error: error ? err(error) : null }
}

export async function adjustStock(partId: string, delta: number, reason: string | null, createdBy: string | null): Promise<DBResponse<SparePart>> {
  if (!isSupabaseConfigured) return notConfigured()
  const { data: sp } = await supabase.from('spare_parts').select('quantity').eq('id', partId).single()
  const current = (sp as SparePart | null)?.quantity ?? 0
  const next = Math.max(0, current + delta)
  const { data, error } = await supabase
    .from('spare_parts')
    .update({ quantity: next, updated_at: new Date().toISOString() })
    .eq('id', partId)
    .select().single()
  if (error) return { data: null, error: err(error) }
  await supabase.from('stock_movements').insert({
    spare_part_id: partId,
    type: delta >= 0 ? 'in' : 'out',
    quantity: Math.abs(delta),
    reason,
    created_by: createdBy,
  })
  return { data: data as SparePart | null, error: null }
}

/* ------------------------------------------------------------------ */
/* Payments                                                           */
/* ------------------------------------------------------------------ */
export async function getPayments(jobId: string): Promise<DBResponse<Payment[]>> {
  if (!isSupabaseConfigured) return notConfigured()
  const { data, error } = await supabase.from('payments').select('*').eq('repair_job_id', jobId).order('payment_date', { ascending: false })
  return { data: data as Payment[] | null, error: error ? err(error) : null }
}

export async function recordPayment(
  jobId: string,
  amount: number,
  method: PaymentMethod,
  note: string | null,
  createdBy: string | null
): Promise<DBResponse<Payment>> {
  if (!isSupabaseConfigured) return notConfigured()
  const { data, error } = await supabase
    .from('payments')
    .insert({ repair_job_id: jobId, amount, payment_method: method, note, created_by: createdBy })
    .select().single()
  return { data: data as Payment | null, error: error ? err(error) : null }
}

export async function deletePayment(id: string): Promise<DBResponse<null>> {
  if (!isSupabaseConfigured) return notConfigured()
  const { error } = await supabase.from('payments').delete().eq('id', id)
  return { data: null, error: error ? err(error) : null }
}

/* ------------------------------------------------------------------ */
/* Cars with unpaid balance (no facture required)                      */
/* ------------------------------------------------------------------ */
export async function getUnpaidJobs(): Promise<DBResponse<any[]>> {
  if (!isSupabaseConfigured) return notConfigured()
  const { data, error } = await supabase
    .from('repair_jobs')
    .select(`
      id, job_number, status, amount_paid, additional_costs, discount, entry_date,
      customers ( full_name, phone ),
      vehicles ( brand, model, license_plate ),
      repair_tasks ( labor_price ),
      repair_parts ( quantity, unit_price )
    `)
    .order('entry_date', { ascending: false })
  if (error) return { data: null, error: err(error) }
  const list = ((data as any[]) ?? [])
    .map((j) => {
      const labor = (j.repair_tasks || []).reduce((s: number, t: any) => s + Number(t.labor_price || 0), 0)
      const parts = (j.repair_parts || []).reduce((s: number, p: any) => s + Number(p.quantity || 0) * Number(p.unit_price || 0), 0)
      const total = Math.max(0, labor + parts + Number(j.additional_costs || 0) - Number(j.discount || 0))
      const balance = Math.max(0, total - Number(j.amount_paid || 0))
      return {
        id: j.id,
        job_number: j.job_number,
        status: j.status,
        customer_name: j.customers?.full_name || '—',
        vehicle: `${j.vehicles?.brand || ''} ${j.vehicles?.model || ''}`.trim() || '—',
        plate: j.vehicles?.license_plate || '—',
        total,
        paid: Number(j.amount_paid || 0),
        balance,
      }
    })
    .filter((j) => j.balance > 0.009)
    .sort((a, b) => b.balance - a.balance)
  return { data: list, error: null }
}

/**
 * Delete an entry from the "restent à payer" list:
 * - removes any UNPAID facture linked to the repair job (no money recorded)
 * - then deletes the repair job itself (tasks, parts, payments, history cascade)
 * Paid factures are intentionally kept as financial records.
 */
export async function deleteUnpaidEntry(jobId: string): Promise<DBResponse<null>> {
  if (!isSupabaseConfigured) return notConfigured()
  const { error: invErr } = await supabase
    .from('invoices')
    .delete()
    .eq('repair_job_id', jobId)
    .eq('is_paid', false)
  if (invErr) return { data: null, error: err(invErr) }
  return deleteJob(jobId)
}

/* ------------------------------------------------------------------ */
/* Invoices                                                           */
/* ------------------------------------------------------------------ */
export async function getInvoices(): Promise<DBResponse<Invoice[]>> {
  if (!isSupabaseConfigured) return notConfigured()
  const { data, error } = await supabase.from('invoices').select('*').order('issue_date', { ascending: false })
  return { data: data as Invoice[] | null, error: error ? err(error) : null }
}

export async function getInvoice(id: string): Promise<DBResponse<Invoice>> {
  if (!isSupabaseConfigured) return notConfigured()
  const { data, error } = await supabase.from('invoices').select('*').eq('id', id).single()
  return { data: data as Invoice | null, error: error ? err(error) : null }
}

export async function createInvoice(payload: Omit<Invoice, 'id' | 'created_at'>): Promise<DBResponse<Invoice>> {
  if (!isSupabaseConfigured) return notConfigured()
  const { data, error } = await supabase.from('invoices').insert(payload).select().single()
  return { data: data as Invoice | null, error: error ? err(error) : null }
}

export async function updateInvoice(id: string, patch: Partial<Invoice>): Promise<DBResponse<Invoice>> {
  if (!isSupabaseConfigured) return notConfigured()
  const { data, error } = await supabase.from('invoices').update(patch).eq('id', id).select().single()
  return { data: data as Invoice | null, error: error ? err(error) : null }
}

export async function nextInvoiceNumber(prefixArg?: string): Promise<{ number: string | null; error: string | null }> {
  if (!isSupabaseConfigured) return { number: null, error: 'Supabase non configuré.' }
  const { data: settings } = await supabase.from('garage_settings').select('invoice_number_prefix').eq('id', 1).single()
  const prefix = settings?.invoice_number_prefix || prefixArg || 'FACT'
  const { data, error } = await supabase.from('invoices').select('invoice_number').order('invoice_number', { ascending: false }).limit(1)
  if (error) return { number: null, error: err(error) }
  const last = (data as any[])?.[0]?.invoice_number
  const seq = last && Number.isFinite(parseInt(last.replace(prefix, ''), 10)) ? parseInt(last.replace(prefix, ''), 10) : 0
  return { number: `${prefix}${String(seq + 1).padStart(4, '0')}`, error: null }
}

/* ------------------------------------------------------------------ */
/* Dashboard stats                                                    */
/* ------------------------------------------------------------------ */
export async function getDashboardStats(): Promise<DBResponse<DashboardStats>> {
  if (!isSupabaseConfigured) return notConfigured()
  const now = new Date()
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()

  const [jobsRes, paymentsRes] = await Promise.all([
    supabase.from('repair_jobs').select(`
      status, amount_paid, entry_date, additional_costs, discount,
      repair_tasks(labor_price),
      repair_parts(quantity, unit_price)
    `),
    supabase.from('payments').select('amount, payment_date'),
  ])

  if (jobsRes.error) return { data: null, error: err(jobsRes.error) }
  if (paymentsRes.error) return { data: null, error: err(paymentsRes.error) }

  const jobs = (jobsRes.data as any[]) ?? []
  const payments = (paymentsRes.data as any[]) ?? []

  const statusCounts: Record<string, number> = {}
  jobs.forEach((j) => { statusCounts[j.status] = (statusCounts[j.status] || 0) + 1 })

  const totalCars = jobs.filter(j => j.status !== 'delivered').length
  const underMaintenance = jobs.filter((j) => isMaintenanceStatus(j.status as RepairStatus)).length
  const awaitingDiagnosis = statusCounts['awaiting_diagnosis'] || 0
  const awaitingParts = statusCounts['awaiting_parts'] || 0
  const finished = statusCounts['finished'] || 0
  const delivered = statusCounts['delivered'] || 0

  // Cars not fully paid: remaining amount to collect on each repair job
  // (computed from its tasks + parts + extra costs − discount − paid), no facture required
  const unpaidInvoices = jobs.filter((j) => {
    const labor = (j.repair_tasks || []).reduce((s: number, t: any) => s + Number(t.labor_price || 0), 0)
    const parts = (j.repair_parts || []).reduce((s: number, p: any) => s + Number(p.quantity || 0) * Number(p.unit_price || 0), 0)
    const total = Math.max(0, labor + parts + Number(j.additional_costs || 0) - Number(j.discount || 0))
    return total - Number(j.amount_paid || 0) > 0.009
  }).length

  // Revenue: sum of payments today and this month
  let revenueToday = 0
  let revenueMonth = 0
  payments.forEach((p) => {
    const amt = Number(p.amount || 0)
    const d = new Date(p.payment_date)
    if (d >= new Date(todayStart)) revenueToday += amt
    if (d >= new Date(monthStart)) revenueMonth += amt
  })

  return {
    data: {
      totalCars,
      underMaintenance,
      awaitingDiagnosis,
      awaitingParts,
      finished,
      delivered,
      unpaidInvoices,
      revenueToday: round2(revenueToday),
      revenueMonth: round2(revenueMonth),
    },
    error: null,
  }
}

/* ------------------------------------------------------------------ */
/* Dashboard : widgets complémentaires (données réelles uniquement)    */
/* ------------------------------------------------------------------ */

/** Pièces au niveau du seuil (quantity <= min_stock), les plus critiques d'abord */
export async function getDashboardStockAlerts(): Promise<DBResponse<SparePart[]>> {
  if (!isSupabaseConfigured) return { data: [], error: null }
  const { data, error } = await supabase
    .from('spare_parts')
    .select('id, name, reference, quantity, min_stock')
    .order('quantity', { ascending: true })
  if (error) return { data: null, error: err(error) }
  const alerts = ((data as any[]) ?? [])
    .filter((p) => Number(p.min_stock) > 0 && Number(p.quantity) <= Number(p.min_stock))
    .slice(0, 6)
  return { data: alerts as SparePart[], error: null }
}

export interface DashboardDelivery {
  id: string
  jobNumber: string
  vehicle: string
  plate: string
  customerName: string
  customerPhone: string
  total: number
  balance: number
  deliveredAt: string
}

/** Livraisons du jour : dossiers passés au statut « livré » aujourd'hui */
export async function getDashboardDeliveries(): Promise<DBResponse<DashboardDelivery[]>> {
  if (!isSupabaseConfigured) return { data: [], error: null }
  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)
  const { data, error } = await supabase
    .from('repair_jobs')
    .select(`
      id, job_number, updated_at, amount_paid, additional_costs, discount,
      customers ( full_name, phone ),
      vehicles ( brand, model, license_plate ),
      repair_tasks ( labor_price ),
      repair_parts ( quantity, unit_price )
    `)
    .eq('status', 'delivered')
    .gte('updated_at', todayStart.toISOString())
    .order('updated_at', { ascending: false })
    .limit(10)
  if (error) return { data: null, error: err(error) }
  const list = ((data as any[]) ?? []).map((j) => {
    const labor = (j.repair_tasks || []).reduce((s: number, t: any) => s + Number(t.labor_price || 0), 0)
    const parts = (j.repair_parts || []).reduce((s: number, p: any) => s + Number(p.quantity || 0) * Number(p.unit_price || 0), 0)
    const total = Math.max(0, labor + parts + Number(j.additional_costs || 0) - Number(j.discount || 0))
    return {
      id: j.id,
      jobNumber: j.job_number,
      vehicle: `${j.vehicles?.brand || ''} ${j.vehicles?.model || ''}`.trim() || '—',
      plate: j.vehicles?.license_plate || '—',
      customerName: j.customers?.full_name || '—',
      customerPhone: j.customers?.phone || '',
      total,
      balance: Math.max(0, total - Number(j.amount_paid || 0)),
      deliveredAt: j.updated_at,
    }
  })
  return { data: list, error: null }
}

/** Nombre de dossiers par statut (badges « X Diag / Y Rep » du tableau de bord) */
export async function getDashboardStatusCounts(): Promise<DBResponse<Record<string, number>>> {
  if (!isSupabaseConfigured) return { data: {}, error: null }
  const { data, error } = await supabase.from('repair_jobs').select('status')
  if (error) return { data: null, error: err(error) }
  const counts: Record<string, number> = {}
  for (const j of (data as any[]) ?? []) counts[j.status] = (counts[j.status] || 0) + 1
  return { data: counts, error: null }
}

/* ------------------------------------------------------------------ */
/* Revenue timeline (last N days, from real payments)                  */
/* ------------------------------------------------------------------ */
export async function getRevenueTimeline(daysBack = 14): Promise<DBResponse<{ date: string; amount: number }[]>> {
  if (!isSupabaseConfigured) return { data: [], error: null }
  const start = new Date()
  start.setHours(0, 0, 0, 0)
  start.setDate(start.getDate() - daysBack + 1)
  const { data, error } = await supabase
    .from('payments')
    .select('amount, payment_date')
    .gte('payment_date', start.toISOString())
  if (error) return { data: null, error: err(error) }
  const buckets: Record<string, number> = {}
  for (let i = 0; i < daysBack; i++) {
    const d = new Date()
    d.setDate(d.getDate() - (daysBack - 1 - i))
    buckets[d.toISOString().slice(0, 10)] = 0
  }
  ;((data as any[]) || []).forEach((p) => {
    const k = new Date(p.payment_date).toISOString().slice(0, 10)
    if (k in buckets) buckets[k] += Number(p.amount || 0)
  })
  return { data: Object.entries(buckets).map(([date, amount]) => ({ date, amount })), error: null }
}

/* ------------------------------------------------------------------ */
/* Détail des revenus : mois / semaine / jour (paiements réels)        */
/* ------------------------------------------------------------------ */
export interface RevenuePayment {
  id: string
  jobId: string | null
  jobNumber: string | null
  amount: number
  method: 'cash' | 'transfer' | 'other'
  date: string
}

export interface RevenueDetailSeries {
  subtitle: string
  total: number
  count: number
  average: number
  biggest: number
  cash: number
  transfer: number
  payments: RevenuePayment[]
}

export async function getRevenueDetails(): Promise<DBResponse<{
  month: RevenueDetailSeries
  week: RevenueDetailSeries
  day: RevenueDetailSeries
}>> {
  if (!isSupabaseConfigured) return notConfigured()
  const now = new Date()
  const y = now.getFullYear()
  const m = now.getMonth()
  const monthsFr = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre']
  const fmt = (d: Date) => `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`

  const todayStart = new Date(y, m, now.getDate())
  const monthStart = new Date(y, m, 1)
  const weekStart = new Date(todayStart)
  weekStart.setDate(weekStart.getDate() - ((weekStart.getDay() + 6) % 7)) // lundi
  const weekEnd = new Date(weekStart)
  weekEnd.setDate(weekEnd.getDate() + 6)

  // Les trois périodes sont bornées au mois en cours : une seule requête suffit
  const { data, error } = await supabase
    .from('payments')
    .select('id, amount, payment_method, payment_date, repair_jobs(id, job_number)')
    .gte('payment_date', monthStart.toISOString())
    .order('payment_date', { ascending: false })
  if (error) return { data: null, error: err(error) }

  const all = ((data as any[]) || []).map((p) => ({
    id: p.id as string,
    jobId: p.repair_jobs?.id ?? null,
    jobNumber: p.repair_jobs?.job_number ?? null,
    amount: Number(p.amount || 0),
    method: (p.payment_method || 'cash') as RevenuePayment['method'],
    date: p.payment_date as string,
  }))

  const build = (
    from: Date,
    to: Date | null,
    subtitle: string,
  ): RevenueDetailSeries => {
    const list = all.filter((p) => {
      const d = new Date(p.date)
      return d >= from && (!to || d < to)
    })
    const total = round2(list.reduce((s, p) => s + p.amount, 0))
    return {
      subtitle,
      total,
      count: list.length,
      average: list.length ? round2(total / list.length) : 0,
      biggest: list.length ? round2(Math.max(...list.map((p) => p.amount))) : 0,
      cash: round2(list.filter((p) => p.method === 'cash').reduce((s, p) => s + p.amount, 0)),
      transfer: round2(list.filter((p) => p.method === 'transfer').reduce((s, p) => s + p.amount, 0)),
      payments: list,
    }
  }

  return {
    data: {
      month: build(monthStart, null, `${monthsFr[m].charAt(0).toUpperCase()}${monthsFr[m].slice(1)} ${y}`),
      week: build(weekStart, new Date(weekEnd.getTime() + 86400000), `Semaine du ${fmt(weekStart)} au ${fmt(weekEnd)}`),
      day: build(todayStart, null, `Aujourd'hui — ${fmt(todayStart)}/${y}`),
    },
    error: null,
  }
}

/* ------------------------------------------------------------------ */
/* Reports                                                            */
/* ------------------------------------------------------------------ */
export async function getReports({
  from,
  to,
}: { from: string; to: string }) {
  if (!isSupabaseConfigured) return notConfigured()
  const toInclusive = new Date(to)
  toInclusive.setDate(toInclusive.getDate() + 1)
  const toStr = toInclusive.toISOString()

  const [jobsRes, paymentsRes, invoicesRes, tasksRes, partsRes] = await Promise.all([
    supabase.from('repair_jobs').select('status, entry_date, updated_at').gte('entry_date', from).lte('entry_date', toStr),
    supabase.from('payments').select('amount, payment_date').gte('payment_date', from).lte('payment_date', toStr),
    supabase.from('invoices').select('total, amount_paid, balance_due, issue_date, is_paid').gte('issue_date', from).lte('issue_date', toStr),
    supabase.from('repair_tasks').select('task_name, labor_price, created_at').gte('created_at', from).lte('created_at', toStr),
    supabase.from('repair_parts').select('part_name, quantity, unit_price, created_at').gte('created_at', from).lte('created_at', toStr),
  ])

  const firstError = jobsRes.error || paymentsRes.error || invoicesRes.error || tasksRes.error || partsRes.error

  return {
    jobs: jobsRes.error ? [] : (jobsRes.data as any[]),
    payments: paymentsRes.error ? [] : (paymentsRes.data as any[]),
    invoices: invoicesRes.error ? [] : (invoicesRes.data as any[]),
    tasks: tasksRes.error ? [] : (tasksRes.data as any[]),
    jobParts: partsRes.error ? [] : (partsRes.data as any[]),
    error: firstError ? firstError.message : null,
  }
}

/* ------------------------------------------------------------------ */
/* Stock movements                                                    */
/* ------------------------------------------------------------------ */
export async function getStockMovements(partId?: string): Promise<DBResponse<StockMovement[]>> {
  if (!isSupabaseConfigured) return notConfigured()
  let q = supabase.from('stock_movements').select('*').order('created_at', { ascending: false })
  if (partId) q = q.eq('spare_part_id', partId)
  const { data, error } = await q
  return { data: data as StockMovement[] | null, error: error ? err(error) : null }
}

function round2(v: number) { return Math.round(v * 100) / 100 }

/* ------------------------------------------------------------------ */
/* Totals computation                                                 */
/* ------------------------------------------------------------------ */
export function computeTotals({
  tasks,
  jobParts,
  additionalCosts = 0,
  discount = 0,
  amountPaid = 0,
}: {
  tasks: RepairTask[]
  jobParts: RepairPart[]
  additionalCosts?: number
  discount?: number
  amountPaid?: number
}): JobTotals {
  const labor = tasks.reduce((sum, t) => sum + Number(t.labor_price || 0), 0)
  const parts = jobParts.reduce((sum, p) => sum + Number(p.quantity || 0) * Number(p.unit_price || 0), 0)
  const subtotal = labor + parts + Number(additionalCosts || 0)
  const total = Math.max(0, subtotal - Number(discount || 0))
  const paid = Number(amountPaid || 0)
  const balance = Math.max(0, total - paid)
  return { labor, parts, additional: Number(additionalCosts || 0), discount: Number(discount || 0), subtotal, total, paid, balance }
}

/* ------------------------------------------------------------------ */
/* CSV export                                                         */
/* ------------------------------------------------------------------ */
export function toCSV(rows: any[]): string {
  if (!rows.length) return ''
  const headers = Object.keys(rows[0])
  const escape = (v: any) => {
    if (v === null || v === undefined) return ''
    const s = String(v)
    if (s.includes(',') || s.includes('"') || s.includes('\n')) return '"' + s.replace(/"/g, '""') + '"'
    return s
  }
  const lines = [headers.join(',')]
  rows.forEach((r) => lines.push(headers.map(h => escape(r[h])).join(',')))
  return lines.join('\n')
}

export function downloadCSV(content: string, filename: string) {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

export function formatStatusLabel(status: RepairStatus): string {
  return statusLabel(status)
}
