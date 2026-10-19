/**
 * GaragePro — add demo cars (20 random pipeline cars).
 * All demo customers are marked with address 'Adresse démo' so
 * scripts/reset-test-data.cjs can purge them easily.
 *
 * Usage: node scripts/add-demo-cars.cjs <email> <password> [n]
 */
const fs = require('fs')
const path = require('path')
const env = fs.readFileSync(path.join(__dirname, '..', '.env'), 'utf8')
const url = env.match(/VITE_SUPABASE_URL=(.+)/)[1].trim().replace(/\/$/, '')
const anonKey = env.match(/VITE_SUPABASE_ANON_KEY=(.+)/)[1].trim()

const email = process.argv[2]
const password = process.argv[3]
const N = parseInt(process.argv[4] || '20', 10)
if (!email || !password) { console.error('Usage: node scripts/add-demo-cars.cjs <email> <password> [n]'); process.exit(1) }

let token = null
let userId = null

const authHeaders = async () => ({ apikey: anonKey, Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' })

async function rest(method, p, body, preferRep = false) {
  const headers = await authHeaders()
  if (preferRep) headers.Prefer = 'return=representation'
  const res = await fetch(`${url}/rest/v1/${p}`, { method, headers, body: body ? JSON.stringify(body) : undefined })
  const text = await res.text()
  let data = null
  try { data = text ? JSON.parse(text) : null } catch { data = text }
  return { status: res.status, data }
}

const rnd = (a) => a[Math.floor(Math.random() * a.length)]
const ri = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min

const NAMES = ['Mounir Haddad', 'Ines Kefi', 'Walid Jaziri', 'Dorra Mansour', 'Slim Ben Youssef', 'Amira Trigui', 'Karim Sassi', 'Hanen Belhaj', 'Yassine Mabrouk', 'Sonia Ferchichi', 'Tarek Zouari', 'Maha Ayari', 'Fares Gatniji', 'Rim Bouazizi', 'Anis Mejri', 'Nour Chaabane', 'Mehdi Kooli', 'Sirine Abdennour', 'Oussama Gharbi', 'Mariem Ben Romdhane']
const BRANDS = ['Peugeot', 'Renault', 'Volkswagen', 'Toyota', 'Hyundai', 'Fiat', 'Kia', 'Citroën', 'Suzuki', 'Dacia', 'Nissan', 'Ford', 'Opel', 'Seat', 'Chevrolet']
const MODELS = ['Clio 4', 'Golf 7', 'Polo', 'Symbol', 'Kangoo', 'Ibiza', 'Corolla', 'Yaris', 'i10', 'Tucson', 'Punto', 'Panda', 'Picanto', 'C3', 'Swift', 'Sandero', 'Micra', 'Fiesta', 'Corsa', 'Octavia']
const PROBLEMS = [
  'Bruit anormal au freinage',
  'Voyant moteur allumé',
  'Fuite d\u2019huile sous le véhicule',
  'Batterie ne tient pas la charge',
  'Cardant usé — claquement en virage',
  'Climatisation ne refroidit plus',
  'Boîte de vitesses accroche',
  'Surconsommation de carburant',
  'Vibrations à haute vitesse',
  'Démarrage difficile à froid',
]
const TASKS = [
  ['Vidange + filtres', 60], ['Plaquettes de frein', 90], ['Diagnostic électronique', 45],
  ['Révision complète', 140], ['Réparation cardant', 180], ['Charge clim + régas', 85],
  ['Changement courroie', 220], ['Géométrie / parallélisme', 55], ['Vidange boîte automatique', 260],
]
const PARTS = [['Filtre à huile', 18], ['Plaquettes de frein (jeu)', 65], ['Batterie 70Ah', 190], ['Courroie de distribution', 240], ['Amortisseur avant', 145], ['Filtre à air', 22], ['Bougies (jeu de 4)', 48], ['Disques de frein', 130]]

// Statuses so every pipeline section has content
const STATUS_PLAN = ['awaiting_diagnosis', 'received', 'under_repair', 'awaiting_diagnosis', 'testing', 'under_repair', 'awaiting_parts', 'finished', 'delivered', 'awaiting_approval', 'under_repair', 'awaiting_diagnosis', 'received', 'testing', 'finished', 'under_repair', 'awaiting_diagnosis', 'awaiting_parts', 'delivered', 'awaiting_approval']
const STATUS_LABELS = {
  received: 'Réceptionné', awaiting_diagnosis: 'En attente de diagnostic',
  awaiting_approval: "En attente d'approbation", awaiting_parts: 'En attente de pièces',
  under_repair: 'En réparation', testing: 'Testing', finished: 'Terminé', delivered: 'Livré',
}

async function main() {
  const r = await fetch(`${url}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: { apikey: anonKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })
  const login = await r.json()
  if (!r.ok) { console.error('LOGIN FAILED:', login.error_description || login.msg || login); process.exit(1) }
  token = login.access_token
  const me = await (await fetch(`${url}/auth/v1/user`, { headers: await authHeaders() })).json()
  userId = me.id
  console.log(`✓ Logged in as ${me.email}`)

  const failures = []
  for (let i = 1; i <= N; i++) {
    const name = rnd(NAMES)
    const brand = rnd(BRANDS)
    const model = rnd(MODELS)
    const plate = `${ri(100, 999)} TU ${ri(1000, 9999)}`
    // Entry date spread over the last 12 days so the dashboard looks alive
    const daysAgo = ri(0, 12)
    const entry = new Date(Date.now() - daysAgo * 86400000 - ri(0, 12) * 3600000).toISOString()
    const status = STATUS_PLAN[(i - 1) % STATUS_PLAN.length]

    let res = await rest('POST', 'customers', {
      full_name: name, phone: `+216${ri(20, 99)}${ri(100000, 999999)}`, email: null,
      address: 'Adresse démo', created_by: userId, created_at: entry, updated_at: entry,
    }, true)
    const customer = Array.isArray(res.data) ? res.data[0] : res.data
    if (res.status >= 300) { failures.push(`customer ${i}: ${res.status} ${JSON.stringify(res.data)}`); continue }

    res = await rest('POST', 'vehicles', {
      customer_id: customer.id, brand, model,
      color: rnd(['Blanc', 'Noir', 'Gris', 'Bleu', 'Rouge', 'Vert']),
      license_plate: plate, model_year: ri(2009, 2024), mileage_km: ri(15000, 240000),
      fuel_type: rnd(['diesel', 'essence']), vin: null, created_at: entry, updated_at: entry,
    }, true)
    const vehicle = Array.isArray(res.data) ? res.data[0] : res.data
    if (res.status >= 300) { failures.push(`vehicle ${i}: ${res.status} ${JSON.stringify(res.data)}`); continue }

    res = await rest('POST', 'rpc/next_job_number', { p_year: new Date().getFullYear(), p_prefix: 'GAR' })
    const jobNumber = typeof res.data === 'string' ? res.data : (res.data?.[0] ?? null)
    if (!jobNumber) { failures.push(`rpc ${i}: ${res.status} ${JSON.stringify(res.data)}`); continue }

    res = await rest('POST', 'repair_jobs', {
      job_number: jobNumber, customer_id: customer.id, vehicle_id: vehicle.id,
      reported_problem: rnd(PROBLEMS), entry_date: entry,
      expected_completion_date: new Date(Date.now() + ri(1, 5) * 86400000).toISOString(),
      status, priority: rnd(['normal', 'normal', 'normal', 'urgent', 'very_urgent']),
      assigned_mechanic: rnd(['mohamed', 'ahmed', 'khaled']), initial_diagnosis: null,
      photos: [], notes: null,
      total_labor: 0, total_parts: 0, additional_costs: 0, discount: 0, amount_paid: 0,
      created_at: entry, updated_at: entry,
    }, true)
    const job = Array.isArray(res.data) ? res.data[0] : res.data
    if (res.status >= 300) { failures.push(`job ${i}: ${res.status} ${JSON.stringify(res.data)}`); continue }

    await rest('POST', 'status_history', {
      repair_job_id: job.id, old_status: null, new_status: 'received',
      changed_by: userId, changed_at: entry, note: 'Véhicule réceptionné et enregistré.',
    }, true)
    if (status !== 'received') {
      await rest('POST', 'status_history', {
        repair_job_id: job.id, old_status: 'received', new_status: status,
        changed_by: userId, changed_at: new Date(Date.now() - Math.max(0, daysAgo - 1) * 86400000).toISOString(),
        note: `Statut mis à jour : ${STATUS_LABELS[status]}`,
      }, true)
    }

    // Random number of tasks + parts
    const nTasks = ri(1, 3)
    for (let k = 0; k < nTasks; k++) {
      const [tName, base] = rnd(TASKS)
      await rest('POST', 'repair_tasks', {
        repair_job_id: job.id, task_name: tName,
        labor_price: base + ri(-10, 20), created_at: entry,
      }, true)
    }
    const nParts = ri(0, 3)
    for (let k = 0; k < nParts; k++) {
      const [pName, base] = rnd(PARTS)
      await rest('POST', 'repair_parts', {
        repair_job_id: job.id, spare_part_id: null, part_name: pName,
        quantity: ri(1, 2), unit_price: base, created_at: entry,
      }, true)
    }

    // Payments on finished/delivered/under_repair cars, dated within last 14 days (feeds the revenue graph)
    if (['finished', 'delivered', 'under_repair', 'testing'].includes(status) && Math.random() < 0.75) {
      const amount = ri(40, 700)
      const payDate = new Date(Date.now() - ri(0, 13) * 86400000).toISOString()
      await rest('POST', 'payments', {
        repair_job_id: job.id, amount, payment_method: rnd(['cash', 'card', 'check', 'bank_transfer']),
        payment_date: payDate, recorded_by: userId, notes: null, created_at: payDate,
      }, true)
    }

    console.log(`✓ ${jobNumber} — ${brand} ${model} (${plate}) → ${STATUS_LABELS[status]}`)
  }

  if (failures.length) { console.error(`\n${failures.length} FAILURES:`); failures.forEach((f) => console.error(' -', f)); process.exit(1) }
  console.log(`\n✓ ${N} demo cars added (purge anytime with: node scripts/reset-test-data.cjs)`)
}
main().catch((e) => { console.error(e); process.exit(1) })
