const LENS_HEX = { rojo: '#c83030', naranja: '#d96020', amarillo: '#c9a015' }

let sales     = []
let editingId = null
let deleteId  = null

// ── Load stats ────────────────────────────────────────────────
async function loadStats() {
  try {
    const res  = await fetch('/api/stats')
    if (!res.ok) return
    const data = await res.json()
    const s    = data.sales || {}
    document.querySelector('#stat-revenue').textContent = price(s.totalRevenue)
    document.querySelector('#stat-today').textContent   = price(s.todayRevenue)
    document.querySelector('#stat-units').textContent   = s.totalUnits  ?? 0
    document.querySelector('#stat-orders').textContent  = s.totalOrders ?? 0
  } catch { /* silent */ }
}

// ── Load sales ────────────────────────────────────────────────
async function loadSales() {
  try {
    const res = await fetch('/api/sales')
    if (!res.ok) throw new Error()
    sales = await res.json()

    document.querySelector('#sales-loading').hidden = true
    buildChart(sales)

    if (!sales.length) {
      document.querySelector('#sales-empty').hidden = false
      document.querySelector('#sales-body').innerHTML = ''
      return
    }

    document.querySelector('#sales-empty').hidden = true
    document.querySelector('#sales-body').innerHTML = sales.map((sale, i) => saleRow(sale, i)).join('')
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

  const noteLine = sale.notes
    ? `<p style="margin-top:8px;color:var(--muted);font-size:.82rem">📝 ${esc(sale.notes)}</p>`
    : ''

  return `
    <tr class="sale-row">
      <td style="color:var(--amber);font-family:'Cormorant Garamond',serif">#${num}</td>
      <td class="td-muted">${date}</td>
      <td>${esc(names)}</td>
      <td class="td-muted">${units} uds.</td>
      <td>${price(sale.total)}</td>
      <td><button class="expand-btn" data-target="${detailId}">▼</button></td>
      <td>
        <div class="row-actions">
          <button class="btn btn-ghost btn-sm" data-action="edit"   data-id="${esc(sale._id)}">Editar</button>
          <button class="btn btn-danger-outline btn-sm" data-action="delete" data-id="${esc(sale._id)}" data-name="#${num}">Eliminar</button>
        </div>
      </td>
    </tr>
    <tr class="sale-detail" id="${detailId}" hidden>
      <td colspan="7">
        <div class="sale-detail-inner">
          <div class="sale-items-list">${itemRows}</div>
          ${noteLine}
        </div>
      </td>
    </tr>
  `
}

// ── Edit modal ────────────────────────────────────────────────
function openEdit(id) {
  const sale = sales.find(s => s._id === id)
  if (!sale) return
  editingId = id

  // Mostrar items (solo lectura)
  const itemsEl = document.querySelector('#edit-items')
  itemsEl.innerHTML = sale.items.map(it => `
    <div style="display:flex;align-items:center;gap:10px;font-size:.88rem">
      <span style="width:8px;height:8px;border-radius:50%;background:${LENS_HEX[it.lensColor] || '#888'};flex-shrink:0"></span>
      <span>${esc(it.name)} ×${it.quantity}</span>
      <span style="margin-left:auto;color:var(--muted)">${price(it.subtotal)}</span>
    </div>
  `).join('')

  document.querySelector('#edit-total').value = sale.total
  document.querySelector('#edit-notes').value = sale.notes || ''
  document.querySelector('#modal-edit').hidden = false
}

function closeEdit() {
  document.querySelector('#modal-edit').hidden = true
  editingId = null
}

async function handleEditSubmit(e) {
  e.preventDefault()
  if (!editingId) return

  const btn = document.querySelector('#edit-save')
  btn.disabled = true
  btn.textContent = 'Guardando…'

  try {
    const res = await fetch(`/api/sales/${editingId}`, {
      method: 'PUT',
      body: JSON.stringify({
        total: Number(document.querySelector('#edit-total').value),
        notes: document.querySelector('#edit-notes').value.trim(),
      }),
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.error || 'Error al guardar')
    }
    closeEdit()
    await Promise.all([loadSales(), loadStats()])
    showToast('success', 'Venta actualizada')
  } catch (err) {
    showToast('error', err.message)
  } finally {
    btn.disabled = false
    btn.textContent = 'Guardar cambios'
  }
}

// ── Delete modal ──────────────────────────────────────────────
function openDelete(id, name) {
  deleteId = id
  document.querySelector('#delete-sale-name').textContent = name
  document.querySelector('#modal-delete').hidden = false
}

function closeDelete() {
  document.querySelector('#modal-delete').hidden = true
  deleteId = null
}

async function handleDelete() {
  if (!deleteId) return
  const btn = document.querySelector('#delete-confirm')
  btn.disabled = true

  try {
    const res = await fetch(`/api/sales/${deleteId}`, { method: 'DELETE' })
    if (!res.ok) throw new Error()
    closeDelete()
    await Promise.all([loadSales(), loadStats()])
    showToast('success', 'Venta eliminada del historial')
  } catch {
    showToast('error', 'No se pudo eliminar')
  } finally {
    btn.disabled = false
  }
}

// ── Chart ─────────────────────────────────────────────────────
function buildChart(list) {
  const days   = last7days()
  const totals = {}
  list.forEach(s => {
    const day = s.createdAt?.slice(0, 10)
    if (day) totals[day] = (totals[day] || 0) + s.total
  })

  const values = days.map(d => totals[d] || 0)
  const max    = Math.max(...values, 1)
  const today  = new Date().toISOString().slice(0, 10)

  document.querySelector('#chart-bars').innerHTML = days.map((day, i) => {
    const pct     = Math.round((values[i] / max) * 100)
    const isToday = day === today
    const val     = values[i] > 0 ? priceK(values[i]) : ''
    return `
      <div class="chart-col">
        <div class="chart-bar-wrap">
          <div class="chart-bar ${values[i] > 0 ? 'has-data' : ''}" style="height:${Math.max(pct, 3)}%">
            ${val ? `<span class="chart-val">${val}</span>` : ''}
          </div>
        </div>
        <span class="chart-day ${isToday ? 'today' : ''}">${shortDay(day)}</span>
      </div>
    `
  }).join('')
}

function last7days() {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (6 - i)); return d.toISOString().slice(0, 10)
  })
}

function shortDay(iso) {
  return new Date(iso + 'T12:00:00').toLocaleDateString('es-CR', { weekday: 'short' })
}

// ── Table delegation ──────────────────────────────────────────
function setupTable() {
  document.querySelector('#sales-body').addEventListener('click', e => {
    // Expand
    const expandBtn = e.target.closest('.expand-btn[data-target]')
    if (expandBtn) {
      const detail = document.querySelector('#' + expandBtn.dataset.target)
      if (detail) { detail.hidden = !detail.hidden; expandBtn.textContent = detail.hidden ? '▼' : '▲' }
      return
    }
    // Edit / Delete
    const btn = e.target.closest('button[data-action]')
    if (!btn) return
    if (btn.dataset.action === 'edit')   openEdit(btn.dataset.id)
    if (btn.dataset.action === 'delete') openDelete(btn.dataset.id, btn.dataset.name)
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
  t.className = `toast ${type}`; t.textContent = msg
  document.querySelector('#toast-container').appendChild(t)
  setTimeout(() => { t.classList.add('fade-out'); setTimeout(() => t.remove(), 220) }, 3200)
}

// ── Init ──────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  loadStats()
  loadSales()
  setupTable()

  document.querySelector('#edit-form').addEventListener('submit', handleEditSubmit)
  document.querySelector('#edit-cancel').addEventListener('click', closeEdit)
  document.querySelector('#edit-overlay').addEventListener('click', closeEdit)

  document.querySelector('#delete-confirm').addEventListener('click', handleDelete)
  document.querySelector('#delete-cancel').addEventListener('click', closeDelete)
  document.querySelector('#delete-overlay').addEventListener('click', closeDelete)
})
