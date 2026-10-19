/* GarbagePro — delete E2E test data (customers with address 'Adresse test' + their cars) */
const fs = require('fs')
const path = require('path')
const env = fs.readFileSync(path.join(__dirname, '..', '.env'), 'utf8')
const url = env.match(/VITE_SUPABASE_URL=(.+)/)[1].trim()
const anon = env.match(/VITE_SUPABASE_ANON_KEY=(.+)/)[1].trim()

async function main() {
  const login = await (await fetch(url + '/auth/v1/token?grant_type=password', {
    method: 'POST',
    headers: { apikey: anon, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'mazenmaaref@gmail.com', password: 'GarageTest2026' }),
  })).json()
  const h = { apikey: anon, Authorization: 'Bearer ' + login.access_token }
  const get = async (p) => (await fetch(url + p, { headers: h })).json()

  const tc = []
  for (const addr of ['Adresse test', 'Adresse démo']) {
    const found = await get("/rest/v1/customers?select=id&address=eq." + encodeURIComponent(addr))
    if (Array.isArray(found)) tc.push(...found)
  }
  const ids = tc.map((c) => c.id)
  console.log('test customers found:', ids.length)
  for (const id of ids) {
    await fetch(url + '/rest/v1/repair_jobs?customer_id=eq.' + id, { method: 'DELETE', headers: h })
    await fetch(url + '/rest/v1/vehicles?customer_id=eq.' + id, { method: 'DELETE', headers: h })
    await fetch(url + '/rest/v1/customers?id=eq.' + id, { method: 'DELETE', headers: h })
  }
  const jobs = await get('/rest/v1/repair_jobs?select=job_number,status&order=job_number.asc')
  const custs = await get('/rest/v1/customers?select=id')
  const vehs = await get('/rest/v1/vehicles?select=id')
  console.log('remaining jobs:', JSON.stringify(jobs))
  console.log('remaining customers:', custs.length, '| vehicles:', vehs.length)
}
main().catch((e) => { console.error(e); process.exit(1) })
