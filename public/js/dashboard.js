const LENS_HEX = { rojo: '#c83030', naranja: '#d96020', amarillo: '#c9a015' }

// ── Load stats ────────────────────────────────────────────────
async function loadStats() {
  try {
    const res = await fetch('/api/stats')
    if (!res.ok) return
    const data = await res.json()
    const s = data.sales || {}

    document.querySelector('#stat-revenue').textContent = price(s.totalRevenue)
    document.querySelector('#stat-today').textContent   = price(s.todayRevenue)
    document.querySelector('#stat-units').textContent   = s.totalUnits   ?? 0
    document.querySelector('#stat-orders').textContent  = s.totalOrders  ?? 0
  } catch { /* silent */ }
}

// ── Load sales ────────────────────────────────────────────────
async function loadSales() {
  try {
    const res = await fetch('/api/sales')
    if (!res.ok) throw new Error()
    const sales = await res.json()

    document.querySelector('#sales-loading').hidden = true

    buildChart(sales)

    if (!sales.length) {
      document.querySelector('#sales-empty').hidden = false
      return
    }

    const tbody = document.querySelector('#sales-body')
    tbody.innerHTML = sales.map((sale, i) => saleRow(sale, i)).join('')
  } catch {
    document.querySelector('#sales-loading').hidden = true
    showToast('error', 'No se pudieron cargar las ventas')
  }
}

function saleRow(sale, index) {
  const num      = String(index + 1).padStart(3, '0')
  const date     = fmtDate(sale.createdAt)
  const units    = sale.items.reduce((s, it) => s + it.quantity, 0)
  const names    = [...new Set(sale.items.map(it => it.name))].join(', ')
  const detailId = `detail-${sale._id}`

  const itemRows = sale.items.map(it => `
    <div class="sale-item-row">
      <span class="sale-item-dot" style="background:${LENS_HEX[it.lensColor] || '#888'}"></span>
      <span>${esc(it.name)}</span>
      <span class="td-muted">×${it.quantity}</span>
      <span style="margin-left:auto">${price(it.subtotal)}</span>
    </div>
  `).join('')

  return `
    <tr class="sale-row" data-id="${sale._id}">
      <td>#${num}</td>
      <td class="td-muted">${date}</td>
      <td>${esc(names)}</td>
      <td class="td-muted">${units} uds.</td>
      <td>${price(sale.total)}</td>
      <td><button class="expand-btn" data-target="${detailId}">▼</button></td>
    </tr>
    <tr class="sale-detail" id="${detailId}" hidden>
      <td colspan="6">
        <div class="sale-detail-inner">
          <div class="sale-items-list">${itemRows}</div>
        </div>
      </td>
    </tr>
  `
}

// ── Chart ─────────────────────────────────────────────────────
function buildChart(sales) {
  const days   = last7days()
  const totals = {}
  sales.forEach(s => {
    const day = s.createdAt?.slice(0, 10)
    if (day) totals[day] = (totals[day] || 0) + s.total
  })

  const values = days.map(d => totals[d] || 0)
  const max    = Math.max(...values, 1)
  const today  = new Date().toISOString().slice(0, 10)

  const container = document.querySelector('#chart-bars')
  container.innerHTML = days.map((day, i) => {
    const pct    = Math.round((values[i] / max) * 100)
    const isToday = day === today
    const label  = shortDay(day)
    const val    = values[i] > 0 ? priceK(values[i]) : ''

    return `
      <div class="chart-col">
        <div class="chart-bar-wrap">
          <div class="chart-bar ${values[i] > 0 ? 'has-data' : ''}" style="height:${Math.max(pct, 3)}%">
            ${val ? `<span class="chart-val">${val}</span>` : ''}
          </div>
        </div>
        <span class="chart-day ${isToday ? 'today' : ''}">${label}</span>
      </div>
    `
  }).join('')
}

function last7days() {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - (6 - i))
    return d.toISOString().slice(0, 10)
  })
}

function shortDay(iso) {
  const d = new Date(iso + 'T12:00:00')
  return d.toLocaleDateString('es-CR', { weekday: 'short' })
}

// ── Expand rows ───────────────────────────────────────────────
function setupExpand() {
  document.querySelector('#sales-body').addEventListener('click', e => {
    const btn = e.target.closest('.expand-btn[data-target]')
    if (!btn) return
    const detail = document.querySelector('#' + btn.dataset.target)
    if (!detail) return
    detail.hidden = !detail.hidden
    btn.textContent = detail.hidden ? '▼' : '▲'
  })
}

// ── Utils ─────────────────────────────────────────────────────
function price(n)  { return '₡' + Number(n || 0).toLocaleString('es-CR') }
function priceK(n) { return n >= 1000 ? '₡' + Math.round(n / 1000) + 'k' : price(n) }
function esc(v)    { return String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c])) }

function fmtDate(iso) {
  if (!iso) return '—'
  const d = new Date(iso)
  return d.toLocaleDateString('es-CR', { day: 'numeric', month: 'short', year: 'numeric' })
       + ' · ' + d.toLocaleTimeString('es-CR', { hour: '2-digit', minute: '2-digit' })
}

function showToast(type, msg) {
  const t = document.createElement('div')
  t.className = `toast ${type}`
  t.textContent = msg
  document.querySelector('#toast-container').appendChild(t)
  setTimeout(() => { t.classList.add('fade-out'); setTimeout(() => t.remove(), 220) }, 3200)
}

// ── Init ──────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  loadStats()
  loadSales()
  setupExpand()
})
