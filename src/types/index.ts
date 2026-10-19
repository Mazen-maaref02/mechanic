/**
 * GaragePro TypeScript types.
 * These mirror the Supabase/PostgreSQL database schema (see supabase/schema.sql).
 */

export type Language = 'fr' | 'ar' | 'en'

export type UserRole = 'administrator' | 'mechanic' | 'receptionist'

export type RepairStatus =
  | 'received'
  | 'awaiting_diagnosis'
  | 'awaiting_approval'
  | 'awaiting_parts'
  | 'under_repair'
  | 'testing'
  | 'finished'
  | 'delivered'

export type RepairPriority = 'normal' | 'urgent' | 'very_urgent'

export type PaymentMethod = 'cash' | 'transfer' | 'other'

export type InvoiceType = 'estimate' | 'final'

export type StockMovementType = 'in' | 'out' | 'adjustment'

export interface Profile {
  id: string
  email: string
  full_name: string | null
  role: UserRole
  avatar_url: string | null
  created_at: string
}

export interface GarageSettings {
  id: number
  name: string
  logo_url: string | null
  address: string | null
  phone: string | null
  email: string | null
  currency: string
  language: Language
  invoice_footer: string | null
  invoice_number_prefix: string
  invoice_number_next: number
  job_number_prefix: string
  created_at: string
  updated_at: string
}

export interface Customer {
  id: string
  full_name: string
  phone: string
  email: string | null
  address: string | null
  created_at: string
  updated_at: string
  created_by: string | null
}

export interface Vehicle {
  id: string
  customer_id: string | null
  brand: string
  model: string
  color: string | null
  license_plate: string | null
  model_year: number | null
  mileage_km: number | null
  fuel_type: string | null
  vin: string | null
  created_at: string
  updated_at: string
}

export interface RepairJob {
  id: string
  job_number: string
  vehicle_id: string | null
  customer_id: string | null
  reported_problem: string
  entry_date: string
  expected_completion_date: string | null
  status: RepairStatus
  priority: RepairPriority
  assigned_mechanic: string | null
  initial_diagnosis: string | null
  photos: string[]
  notes: string | null
  total_labor: number
  total_parts: number
  additional_costs: number
  discount: number
  amount_paid: number
  created_at: string
  updated_at: string
  // Joined / computed (not stored directly)
  customer_name?: string
  customer_phone?: string
  vehicle_brand?: string
  vehicle_model?: string
  vehicle_color?: string
  vehicle_license_plate?: string
  status_label?: string
}

export interface StatusHistory {
  id: string
  repair_job_id: string
  old_status: string | null
  new_status: string
  changed_by: string | null
  changed_at: string
  note: string | null
  changed_by_name?: string
}

export interface RepairTask {
  id: string
  repair_job_id: string
  task_name: string
  labor_price: number
  created_at: string
}

export interface SparePart {
  id: string
  name: string
  reference: string | null
  quantity: number
  purchase_price: number
  selling_price: number
  min_stock: number
  created_at: string
  updated_at: string
}

export interface RepairPart {
  id: string
  repair_job_id: string
  spare_part_id: string | null
  part_name: string
  quantity: number
  unit_price: number
  created_at: string
}

export interface Payment {
  id: string
  repair_job_id: string
  amount: number
  payment_method: PaymentMethod
  payment_date: string
  note: string | null
  created_by: string | null
  created_at: string
}

export interface Invoice {
  id: string
  invoice_number: string
  repair_job_id: string | null
  customer_id: string | null
  issue_date: string
  type: InvoiceType
  subtotal: number
  discount: number
  total: number
  amount_paid: number
  balance_due: number
  is_paid: boolean
  created_at: string
}

export interface StockMovement {
  id: string
  spare_part_id: string
  type: StockMovementType
  quantity: number
  reason: string | null
  created_by: string | null
  created_at: string
}

/** Dashboard statistics */
export interface DashboardStats {
  totalCars: number
  underMaintenance: number
  awaitingDiagnosis: number
  awaitingParts: number
  finished: number
  delivered: number
  unpaidInvoices: number
  revenueToday: number
  revenueMonth: number
}

/** Job totals computed from tasks, parts, payments */
export interface JobTotals {
  labor: number
  parts: number
  additional: number
  discount: number
  subtotal: number
  total: number
  paid: number
  balance: number
}
