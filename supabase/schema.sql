-- ============================================================================
-- GaragePro — Database schema (PostgreSQL / Supabase)
--
-- Run this in the Supabase SQL Editor after creating a project.
-- See README.md for setup instructions.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Profiles / users (extends Supabase auth.users)
-- ----------------------------------------------------------------------------
create table profiles (
  id uuid references auth.users on delete cascade primary key,
  email text unique not null,
  full_name text,
  role text check (role in ('administrator','mechanic','receptionist')) default 'mechanic',
  avatar_url text,
  created_at timestamptz default now()
);

-- ----------------------------------------------------------------------------
-- 2. Garage settings (singleton row, id = 1)
-- ----------------------------------------------------------------------------
create table garage_settings (
  id int primary key default 1 check (id = 1),
  name text default 'GaragePro',
  logo_url text,
  address text,
  phone text,
  email text,
  currency text default 'TND',
  language text default 'fr',
  invoice_footer text default 'Merci de votre confiance.',
  invoice_number_prefix text default 'FACT',
  invoice_number_next int default 1,
  job_number_prefix text default 'GAR',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

insert into garage_settings (id) values (1) on conflict (id) do nothing;

-- ----------------------------------------------------------------------------
-- 3. Customers
-- ----------------------------------------------------------------------------
create table customers (
  id uuid default gen_random_uuid() primary key,
  full_name text not null,
  phone text not null,                 -- international format, e.g. +216XXXXXXXX
  email text,
  address text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  created_by uuid references profiles(id)
);

create index idx_customers_phone on customers(phone);
create index idx_customers_name on customers(full_name);

-- ----------------------------------------------------------------------------
-- 4. Vehicles
-- ----------------------------------------------------------------------------
create table vehicles (
  id uuid default gen_random_uuid() primary key,
  customer_id uuid references customers(id) on delete set null,
  brand text not null,
  model text not null,
  color text,
  license_plate text,
  model_year int,
  mileage_km bigint,
  fuel_type text check (fuel_type in ('essence','diesel','hybride','electrique','gpl','autre')),
  vin text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index idx_vehicles_customer on vehicles(customer_id);
create index idx_vehicles_plate on vehicles(license_plate);

-- ----------------------------------------------------------------------------
-- 5. Repair jobs (the central record for each car)
-- ----------------------------------------------------------------------------
create table repair_jobs (
  id uuid default gen_random_uuid() primary key,
  job_number text unique not null,     -- e.g. GAR-2026-0001
  vehicle_id uuid references vehicles(id) on delete set null,
  customer_id uuid references customers(id) on delete set null, -- denormalized for speed
  reported_problem text not null,
  entry_date timestamptz not null default now(),
  expected_completion_date timestamptz,
  status text not null default 'received',
  priority text check (priority in ('normal','urgent','very_urgent')) default 'normal',
  assigned_mechanic text,
  initial_diagnosis text,
  photos text[] default '{}',          -- URLs of uploaded photos
  notes text,
  total_labor numeric default 0,
  total_parts numeric default 0,
  additional_costs numeric default 0,
  discount numeric default 0,
  amount_paid numeric default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index idx_repair_jobs_status on repair_jobs(status);
create index idx_repair_jobs_job_number on repair_jobs(job_number);
create index idx_repair_jobs_customer on repair_jobs(customer_id);
create index idx_repair_jobs_vehicle on repair_jobs(vehicle_id);
create index idx_repair_jobs_entry_date on repair_jobs(entry_date);

-- ----------------------------------------------------------------------------
-- 6. Status history (audit trail of every status change)
-- ----------------------------------------------------------------------------
create table status_history (
  id uuid default gen_random_uuid() primary key,
  repair_job_id uuid references repair_jobs(id) on delete cascade,
  old_status text,
  new_status text not null,
  changed_by uuid references profiles(id),
  changed_at timestamptz default now(),
  note text
);

create index idx_status_history_job on status_history(repair_job_id);

-- ----------------------------------------------------------------------------
-- 7. Repair tasks (labor lines)
-- ----------------------------------------------------------------------------
create table repair_tasks (
  id uuid default gen_random_uuid() primary key,
  repair_job_id uuid references repair_jobs(id) on delete cascade,
  task_name text not null,
  labor_price numeric not null default 0,
  created_at timestamptz default now()
);

create index idx_repair_tasks_job on repair_tasks(repair_job_id);

-- ----------------------------------------------------------------------------
-- 8. Spare parts inventory
-- ----------------------------------------------------------------------------
create table spare_parts (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  reference text,
  quantity int not null default 0,
  purchase_price numeric default 0,
  selling_price numeric default 0,
  min_stock int default 5,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index idx_spare_parts_name on spare_parts(name);
create index idx_spare_parts_reference on spare_parts(reference);

-- ----------------------------------------------------------------------------
-- 9. Parts used on a repair job
-- ----------------------------------------------------------------------------
create table repair_parts (
  id uuid default gen_random_uuid() primary key,
  repair_job_id uuid references repair_jobs(id) on delete cascade,
  spare_part_id uuid references spare_parts(id) on delete set null, -- link to inventory when applicable
  part_name text not null,
  quantity int not null default 1,
  unit_price numeric not null default 0,
  created_at timestamptz default now()
);

create index idx_repair_parts_job on repair_parts(repair_job_id);

-- ----------------------------------------------------------------------------
-- 10. Payments
-- ----------------------------------------------------------------------------
create table payments (
  id uuid default gen_random_uuid() primary key,
  repair_job_id uuid references repair_jobs(id) on delete cascade,
  amount numeric not null default 0,
  payment_method text check (payment_method in ('cash','transfer','other')) default 'cash',
  payment_date timestamptz default now(),
  note text,
  created_by uuid references profiles(id)
);

create index idx_payments_job on payments(repair_job_id);
create index idx_payments_date on payments(payment_date);

-- ----------------------------------------------------------------------------
-- 11. Invoices (estimate or final)
-- ----------------------------------------------------------------------------
create table invoices (
  id uuid default gen_random_uuid() primary key,
  invoice_number text unique not null,
  repair_job_id uuid references repair_jobs(id) on delete set null,
  customer_id uuid references customers(id) on delete set null,
  issue_date timestamptz default now(),
  type text check (type in ('estimate','final')) default 'final',
  subtotal numeric default 0,
  discount numeric default 0,
  total numeric default 0,
  amount_paid numeric default 0,
  balance_due numeric default 0,
  is_paid boolean default false,
  created_at timestamptz default now()
);

create index idx_invoices_job on invoices(repair_job_id);
create index idx_invoices_number on invoices(invoice_number);

-- ----------------------------------------------------------------------------
-- 12. Stock movements (audit trail for inventory changes)
-- ----------------------------------------------------------------------------
create table stock_movements (
  id uuid default gen_random_uuid() primary key,
  spare_part_id uuid references spare_parts(id) on delete cascade,
  type text check (type in ('in','out','adjustment')) not null,
  quantity int not null,
  reason text,
  created_by uuid references profiles(id),
  created_at timestamptz default now()
);

create index idx_stock_movements_part on stock_movements(spare_part_id);

-- ============================================================================
-- Row Level Security (RLS)
-- ============================================================================
alter table profiles enable row level security;
alter table garage_settings enable row level security;
alter table customers enable row level security;
alter table vehicles enable row level security;
alter table repair_jobs enable row level security;
alter table status_history enable row level security;
alter table repair_tasks enable row level security;
alter table spare_parts enable row level security;
alter table repair_parts enable row level security;
alter table payments enable row level security;
alter table invoices enable row level security;
alter table stock_movements enable row level security;

-- Helper: role check with SECURITY DEFINER — avoids RLS infinite recursion
-- (policies must never SELECT from their own table directly).
create or replace function public.has_role(roles text[])
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = any (roles)
  );
$$;

-- Profiles: users read their own; admins read/manage all.
create policy profiles_select_own on profiles for select
  using (auth.uid() = id);
create policy profiles_select_admin on profiles for select
  using (public.has_role(array['administrator']));
create policy profiles_manage_admin on profiles for all
  using (public.has_role(array['administrator']))
  with check (public.has_role(array['administrator']));

-- Garage settings: all authenticated can read; only admins write.
create policy settings_select_all on garage_settings for select using (true);
create policy settings_manage_admin on garage_settings for all
  using (exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'administrator'))
  with check (exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'administrator'));

-- Customers: all authenticated read; receptionist & admin write.
create policy customers_select_all on customers for select using (true);
create policy customers_manage_receptionist on customers for all
  using (exists (select 1 from profiles p where p.id = auth.uid() and p.role in ('receptionist','administrator')))
  with check (exists (select 1 from profiles p where p.id = auth.uid() and p.role in ('receptionist','administrator')));

-- Vehicles: all authenticated read; receptionist & admin write.
create policy vehicles_select_all on vehicles for select using (true);
create policy vehicles_manage_receptionist on vehicles for all
  using (exists (select 1 from profiles p where p.id = auth.uid() and p.role in ('receptionist','administrator')))
  with check (exists (select 1 from profiles p where p.id = auth.uid() and p.role in ('receptionist','administrator')));

-- Repair jobs: all authenticated read; mechanics/receptionist/admin write.
create policy repair_jobs_select_all on repair_jobs for select using (true);
create policy repair_jobs_manage_staff on repair_jobs for all
  using (exists (select 1 from profiles p where p.id = auth.uid() and p.role in ('mechanic','receptionist','administrator')))
  with check (exists (select 1 from profiles p where p.id = auth.uid() and p.role in ('mechanic','receptionist','administrator')));

-- Status history: all read; insert by the user performing the change.
create policy status_history_select_all on status_history for select using (true);
create policy status_history_insert_staff on status_history for insert
  with check (auth.uid() = changed_by or exists (
    select 1 from profiles p where p.id = auth.uid() and p.role in ('mechanic','receptionist','administrator')
  ));

-- Repair tasks: all read; staff write.
create policy repair_tasks_select_all on repair_tasks for select using (true);
create policy repair_tasks_manage_staff on repair_tasks for all
  using (exists (select 1 from profiles p where p.id = auth.uid() and p.role in ('mechanic','receptionist','administrator')))
  with check (exists (select 1 from profiles p where p.id = auth.uid() and p.role in ('mechanic','receptionist','administrator')));

-- Spare parts: all read; admin & mechanic write.
create policy spare_parts_select_all on spare_parts for select using (true);
create policy spare_parts_manage_staff on spare_parts for all
  using (exists (select 1 from profiles p where p.id = auth.uid() and p.role in ('mechanic','administrator')))
  with check (exists (select 1 from profiles p where p.id = auth.uid() and p.role in ('mechanic','administrator')));

-- Repair parts: all read; staff write.
create policy repair_parts_select_all on repair_parts for select using (true);
create policy repair_parts_manage_staff on repair_parts for all
  using (exists (select 1 from profiles p where p.id = auth.uid() and p.role in ('mechanic','receptionist','administrator')))
  with check (exists (select 1 from profiles p where p.id = auth.uid() and p.role in ('mechanic','receptionist','administrator')));

-- Payments: all read; receptionist & admin write.
create policy payments_select_all on payments for select using (true);
create policy payments_manage_receptionist on payments for all
  using (exists (select 1 from profiles p where p.id = auth.uid() and p.role in ('receptionist','administrator')))
  with check (exists (select 1 from profiles p where p.id = auth.uid() and p.role in ('receptionist','administrator')));

-- Invoices: all read; receptionist & admin write.
create policy invoices_select_all on invoices for select using (true);
create policy invoices_manage_receptionist on invoices for all
  using (exists (select 1 from profiles p where p.id = auth.uid() and p.role in ('receptionist','administrator')))
  with check (exists (select 1 from profiles p where p.id = auth.uid() and p.role in ('receptionist','administrator')));

-- Stock movements: all read; admin & mechanic write.
create policy stock_movements_select_all on stock_movements for select using (true);
create policy stock_movements_manage_staff on stock_movements for all
  using (exists (select 1 from profiles p where p.id = auth.uid() and p.role in ('mechanic','administrator')))
  with check (exists (select 1 from profiles p where p.id = auth.uid() and p.role in ('mechanic','administrator')));

-- ============================================================================
-- Helper function: next job number for a given year (called by app or trigger)
-- ============================================================================
create or replace function next_job_number(p_year int, p_prefix text)
returns text language plpgsql as $$
declare
  n int;
begin
  select coalesce(max(substring(job_number from '-([0-9]+)$')::int), 0) + 1 into n
  from repair_jobs
  where job_number like p_prefix || '-' || p_year || '-%';
  return p_prefix || '-' || p_year || '-' || lpad(n::text, 4, '0');
end;
$$;

-- ============================================================================
-- Auto-create a profiles row on every signup (role defaults to 'receptionist')
-- Runs with SECURITY DEFINER so it can insert even with RLS enabled.
-- ============================================================================
create or replace function public.create_profile_on_signup()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    'receptionist'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.create_profile_on_signup();

-- ============================================================================
-- End of schema
-- ============================================================================
