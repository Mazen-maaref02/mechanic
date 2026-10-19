/**
 * GaragePro — E2E flow test.
 * Logs in with the admin account, then registers N cars exactly like the app does:
 * customer → vehicle → job number (RPC) → repair job → status history → status flow
 * → tasks/parts → payment.
 *
 * Usage: node scripts/e2e-test.mjs <email> <password> [n]
 */
const fs = require('fs')

const path = require('path')
const env = fs.readFileSync(path.join(__dirname, '..', '.env'), 'utf8')
const url = env.match(/VITE_SUPABASE_URL=(.+)/)[1].trim().replace(/\/$/, '')
const anonKey = env.match(/VITE_SUPABASE_ANON_KEY=(.+)/)[1].trim()

const email = process.argv[2]
const password = process.argv[3]
const N = parseInt(process.argv[4] || '5', 10)

if (!email || !password) { console.error('Usage: node scripts/e2e-test.mjs <email> <password> [n]'); process.exit(1) }

let token = null
let userId = null

async function authHeaders() {
  return {
    apikey: anonKey,
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  }
}

async function rest(method, path, body, preferRep = false) {
  const headers = await authHeaders()
  if (preferRep) headers.Prefer = 'return=representation'
  const res = await fetch(`${url}/rest/v1/${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  })
  const text = await res.text()
  let data = null
  try { data = text ? JSON.parse(text) : null } catch { data = text }
  return { status: res.status, data }
}

async function main() {
  console.log(`Project: ${url}`)
  // 1) Log in
  const r = await fetch(`${url}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: { apikey: anonKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })
  const loginData = await r.json()
  if (!r.ok) { console.error('LOGIN FAILED:', loginData.error_description || loginData.msg || loginData); process.exit(1) }
  token = loginData.access_token
  const me = await fetch(`${url}/auth/v1/user`, { headers: await authHeaders() })
  const meData = await me.json()
  userId = meData.id
  console.log(`✓ Logged in as ${meData.email} (${userId})`)

  const failures = []
  const brands = ['Peugeot', 'Renault', 'Volkswagen', 'Toyota', 'Hyundai', 'Fiat', 'Kia', 'Citroën', 'Suzuki', 'Dacia']
  const problems = ['cardant usé', 'batterie ne tient pas', 'fuite d\u2019huile moteur', 'freins bruyants', 'voyant moteur allumé']
  const names = ['Ahmed Ben Salah', 'Fatma Gharbi', 'Kais Trabelsi', 'Salma Naccache', 'Amor Chaabene', 'Nadia Zouari', 'Hichem Baccouche', 'Rania Mezri', 'Sami Ben Amor', 'Leila Chaouch']

  for (let i = 1; i <= N; i++) {
    console.log(`\n=== Car ${i}/${N} ===`)
    const name = names[(i - 1) % names.length]
    const phone = `+2162${(20000000 + i * 137711).toString().slice(0, 7)}`

    // Customer
    let res = await rest('POST', 'customers', {
      full_name: name, phone, email: null, address: 'Adresse test', created_by: userId,
      created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
    }, true)
    const customer = Array.isArray(res.data) ? res.data[0] : res.data
    if (res.status >= 300) { failures.push(`customer ${i}: ${res.status} ${JSON.stringify(res.data)}`); continue }
    console.log(`✓ customer ${customer.id}`)

    // Vehicle
    res = await rest('POST', 'vehicles', {
      customer_id: customer.id,
      brand: brands[(i - 1) % brands.length],
      model: 'Test Modell ' + i,
      color: ['Blanc', 'Noir', 'Gris', 'Bleu', 'Rouge'][i % 5],
      license_plate: `TS ${100+i}${String.fromCharCode(65 + i)}${String.fromCharCode(70 + i)}`,
      model_year: 2018 + (i % 7),
      mileage_km: 50000 + i * 1234,
      fuel_type: 'diesel',
      vin: null,
      created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
    }, true)
    const vehicle = Array.isArray(res.data) ? res.data[0] : res.data
    if (res.status >= 300) { failures.push(`vehicle ${i}: ${res.status} ${JSON.stringify(res.data)}`); continue }
    console.log(`✓ vehicle ${vehicle.id}`)

    // Job number via RPC
    res = await rest('POST', 'rpc/next_job_number', { p_year: new Date().getFullYear(), p_prefix: 'GAR' })
    const jobNumber = typeof res.data === 'string' ? res.data : (res.data?.[0] ?? null)
    if (!jobNumber) { failures.push(`rpc job number ${i}: ${res.status} ${JSON.stringify(res.data)}`); continue }
    console.log(`✓ job number ${jobNumber}`)

    // Repair job
    res = await rest('POST', 'repair_jobs', {
      job_number: jobNumber,
      customer_id: customer.id,
      vehicle_id: vehicle.id,
      reported_problem: problems[(i - 1) % problems.length],
      entry_date: new Date().toISOString(),
      expected_completion_date: new Date(Date.now() + 2 * 86400000).toISOString(),
      status: 'received',
      priority: i % 3 === 0 ? 'urgent' : 'normal',
      assigned_mechanic: 'mohamed',
      initial_diagnosis: null,
      photos: [],
      notes: null,
      total_labor: 0, total_parts: 0, additional_costs: 0, discount: 0, amount_paid: 0,
      created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
    }, true)
    const job = Array.isArray(res.data) ? res.data[0] : res.data
    if (res.status >= 300) { failures.push(`job ${i}: ${res.status} ${JSON.stringify(res.data)}`); continue }
    console.log(`✓ job ${job.id}`)

    // Status history "received"
    res = await rest('POST', 'status_history', {
      repair_job_id: job.id, old_status: null, new_status: 'received',
      changed_by: userId, changed_at: new Date().toISOString(), note: 'Réception test E2E',
    }, true)
    if (res.status >= 300) failures.push(`history ${i}: ${res.status} ${JSON.stringify(res.data)}`)
    else console.log(`✓ history received`)

    // Move through the full status cycle so every dashboard section gets content
    const cycle = ['awaiting_diagnosis', 'under_repair', 'testing', 'delivered', 'finished']
    const step2 = cycle[(i - 1) % cycle.length]
    res = await rest('PATCH', `repair_jobs?id=eq.${job.id}`, { status: step2, updated_at: new Date().toISOString() })
    if (res.status >= 300) failures.push(`patch job ${i}: ${res.status} ${JSON.stringify(res.data)}`)
    else console.log(`✓ status → ${step2}`)

    // Add a task
    res = await rest('POST', 'repair_tasks', {
      repair_job_id: job.id, task_name: 'Vidange + filtres',
      labor_price: 40 + i * 5, created_at: new Date().toISOString(),
    }, true)
    if (res.status >= 300) failures.push(`task ${i}: ${res.status} ${JSON.stringify(res.data)}`)
    else console.log(`✓ task added`)

    // Add a used part (free-text, not from stock)
    res = await rest('POST', 'repair_parts', {
      repair_job_id: job.id, spare_part_id: null,
      part_name: 'Filtre à huile', quantity: 1 + (i % 2),
      unit_price: 15 + i * 2, created_at: new Date().toISOString(),
    }, true)
    if (res.status >= 300) failures.push(`part ${i}: ${res.status} ${JSON.stringify(res.data)}`)
    else console.log(`✓ part added`)

    // Payment on half of them
    if (i % 2 === 1) {
      res = await rest('POST', 'payments', {
        repair_job_id: job.id, amount: 100 * i, payment_method: 'cash',
        payment_date: new Date().toISOString(), note: 'acompte test', created_by: userId,
      }, true)
      if (res.status >= 300) failures.push(`payment ${i}: ${res.status} ${JSON.stringify(res.data)}`)
      else console.log(`✓ payment ${100 * i} DT`)
    }
  }

  console.log('\n================ RESULT ================')
  if (failures.length) {
    console.log(`✗ ${failures.length} failures:`)
    failures.forEach((f) => console.log(' - ' + f))
    process.exit(1)
  }
  console.log(`✓✓ ${N} cars registered with full flow, no failures.`)
}

main().catch((e) => { console.error('UNCAUGHT:', e); process.exit(1) })
