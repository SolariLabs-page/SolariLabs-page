let customers = []

async function loadCustomers() {
  try {
    const res = await fetch('/api/customers')
    if (!res.ok) throw new Error()
    customers = await res.json()
    document.querySelector('#crm-loading').hidden = true
    updateStats(customers)
    render(customers)
  } catch {
    document.querySelector('#crm-loading').hidden = true
    showToast('error', 'No se pudieron cargar los clientes')
  }
}

function updateStats(list) {
  const totalRevenue = list.reduce((s, c) => s + (c.stats?.total || 0), 0)
  const totalOrders  = list.reduce((s, c) => s + (c.stats?.orders || 0), 0)
  document.querySelector('#stat-customers').textContent = list.length
  document.querySelector('#stat-revenue').textContent   = price(totalRevenue)
  document.querySelector('#stat-orders').textContent    = totalOrders
}

function render(list) {
  const tbody = document.querySelector('#crm-body')
  const empty = document.querySelector('#crm-empty')
  if (!list.length) { empty.hidden = false; tbody.innerHTML = ''; return }
  empty.hidden = true

  tbody.innerHTML = list.map(c => `
    <tr>
      <td style="font-weight:500">${esc(c.name)}</td>
      <td class="td-muted">${esc(c.email)}</td>
      <td style="text-align:center">${c.stats?.orders ?? 0}</td>
      <td style="color:var(--amber)">${price(c.stats?.total)}</td>
      <td class="td-muted">${fmtDate(c.createdAt)}</td>
    </tr>
  `).join('')
}

function setupSearch() {
  document.querySelector('#search').addEventListener('input', e => {
    const q = e.target.value.toLowerCase().trim()
    render(customers.filter(c =>
      c.name.toLowerCase().includes(q) || c.email.toLowerCase().includes(q)
    ))
  })
}

function price(n) { return '₡' + Number(n || 0).toLocaleString('es-CR') }
function esc(v)   { return String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c])) }
function fmtDate(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('es-CR', { day:'numeric', month:'short', year:'numeric' })
}

function showToast(type, msg) {
  const t = document.createElement('div')
  t.className = `toast ${type}`
  t.textContent = msg
  document.querySelector('#toast-container').appendChild(t)
  setTimeout(() => { t.classList.add('fade-out'); setTimeout(() => t.remove(), 220) }, 3200)
}

document.addEventListener('DOMContentLoaded', () => {
  loadCustomers()
  setupSearch()
})
