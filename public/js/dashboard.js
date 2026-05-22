const LENS_HEX = { rojo: '#c83030', naranja: '#d96020', amarillo: '#c9a015' }

let sales          = []
let productsCache  = []
let editingId      = null
let deleteId       = null

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
    document.querySelector('#sales-body').innerHTML = sales.map((s, i) => saleRow(s, i)).join('')
  } catch {
    document.querySelector('#sales-loading').hidden = true
    showToast('error', 'No se pudieron cargar las ventas')
  }
}

async function loadProductsForEdit() {
  if (productsCache.length) return productsCache
  try {
    const res = await fetch('/api/products?admin=true')
    if (res.ok) productsCache = await res.json()
  } catch { /* silent */ }
  return productsCache
}

// ── Sale row ──────────────────────────────────────────────────
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
      <span style="margin-left:auto">${price(it.subtotal || it.price * it.quantity)}</span>
    </div>
  `).join('')

  const noteLine = sale.notes
    ? `<p style="margin-top:8px;color:var(--muted);font-size:.82rem">📝 ${esc(sale.notes)}</p>` : ''

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
          <button class="btn btn-ghost btn-sm" data-action="edit" data-id="${esc(sale._id)}">Editar</button>
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
async function openEdit(id) {
  const sale = sales.find(s => s._id === id)
  if (!sale) return
  editingId = id

  const products = await loadProductsForEdit()

  // Fecha + hora separadas
  const dt = toDatetimeLocal(sale.createdAt)
  document.querySelector('#edit-date-day').value = dt.slice(0, 10)
  document.querySelector('#edit-time').value      = dt.slice(11, 16)

  // Notas y total
  document.querySelector('#edit-notes').value = sale.notes || ''
  document.querySelector('#edit-total').value = sale.total

  // Items
  const container = document.querySelector('#edit-items-container')
  container.innerHTML = ''
  sale.items.forEach(item => container.appendChild(buildItemRow(item, products)))
  recalcTotal()

  document.querySelector('#edit-apply-inventory').checked = false
  document.querySelector('#modal-edit').hidden = false
}

function buildItemRow(item, products) {
  const row = document.createElement('div')
  row.className = 'edit-item-row'
  row.style.cssText = 'display:grid;grid-template-columns:1fr 70px 110px 32px;gap:6px;align-items:center'

  const options = [
    `<option value="">— Seleccionar —</option>`,
    ...products.map(p => `<option value="${esc(p._id)}" data-price="${p.price}" data-name="${esc(p.name)}" data-frame="${esc(p.frameColor)}" data-lens="${esc(p.lensColor)}" ${String(p._id) === String(item.productId) ? 'selected' : ''}>${esc(p.name)}</option>`),
  ].join('')

  row.innerHTML = `
    <select class="item-product" style="width:100%">${options}</select>
    <input type="number" class="item-qty"   value="${item.quantity || 1}" min="1" style="width:100%">
    <input type="number" class="item-price" value="${item.price    || 0}" min="0" style="width:100%">
    <button type="button" class="item-remove btn btn-danger-outline btn-sm" style="padding:6px 8px">×</button>
  `

  // Si el producto no está en la lista actual, mostrar el nombre como placeholder
  const sel = row.querySelector('.item-product')
  if (!sel.value && item.name) {
    const placeholder = document.createElement('option')
    placeholder.value = ''
    placeholder.textContent = `${item.name} (eliminado)`
    placeholder.selected = true
    sel.insertBefore(placeholder, sel.firstChild)
  }

  // Al cambiar producto → actualizar precio
  sel.addEventListener('change', () => {
    const opt = sel.selectedOptions[0]
    if (opt?.dataset.price) row.querySelector('.item-price').value = opt.dataset.price
    recalcTotal()
  })

  row.querySelector('.item-qty').addEventListener('input', recalcTotal)
  row.querySelector('.item-price').addEventListener('input', recalcTotal)
  row.querySelector('.item-remove').addEventListener('click', () => { row.remove(); recalcTotal() })

  return row
}

function addEmptyItemRow(products) {
  const container = document.querySelector('#edit-items-container')
  const emptyItem = { productId: '', name: '', quantity: 1, price: 0 }
  container.appendChild(buildItemRow(emptyItem, products))
  recalcTotal()
}

function recalcTotal() {
  const rows  = document.querySelectorAll('#edit-items-container .edit-item-row')
  let total   = 0
  rows.forEach(row => {
    const qty   = parseFloat(row.querySelector('.item-qty')?.value)   || 0
    const price_ = parseFloat(row.querySelector('.item-price')?.value) || 0
    total += qty * price_
  })
  document.querySelector('#edit-calc-total').textContent = price(total)
  document.querySelector('#edit-total').value = total
}

function collectItems() {
  return [...document.querySelectorAll('#edit-items-container .edit-item-row')].map(row => {
    const sel   = row.querySelector('.item-product')
    const opt   = sel?.selectedOptions[0]
    const qty   = parseInt(row.querySelector('.item-qty')?.value)   || 1
    const unitP = parseFloat(row.querySelector('.item-price')?.value) || 0
    return {
      productId:  sel?.value || null,
      name:       opt?.dataset.name  || opt?.textContent?.trim() || '',
      frameColor: opt?.dataset.frame || '',
      lensColor:  opt?.dataset.lens  || '',
      price:      unitP,
      quantity:   qty,
      subtotal:   unitP * qty,
    }
  }).filter(it => it.productId || it.name)
}

function closeEdit() {
  document.querySelector('#modal-edit').hidden = true
  editingId = null
}

async function handleEditSubmit(e) {
  e.preventDefault()
  if (!editingId) return

  const btn = document.querySelector('#edit-save')
  btn.disabled = true; btn.textContent = 'Guardando…'

  try {
    const items           = collectItems()
    const dateDay         = document.querySelector('#edit-date-day').value
    const dateTime        = document.querySelector('#edit-time').value || '00:00'
    const createdAt       = dateDay ? `${dateDay}T${dateTime}:00` : undefined
    const total           = Number(document.querySelector('#edit-total').value)
    const notes           = document.querySelector('#edit-notes').value.trim()
    const applyToInventory = document.querySelector('#edit-apply-inventory').checked

    if (!items.length) throw new Error('Agregá al menos un producto')

    const res = await fetch(`/api/sales/${editingId}`, {
      method: 'PUT',
      body:   JSON.stringify({ items, createdAt, total, notes, applyToInventory }),
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.error || 'Error al guardar')
    }

    closeEdit()
    await Promise.all([loadSales(), loadStats()])
    showToast('success', applyToInventory ? 'Venta actualizada y stock ajustado' : 'Venta actualizada')
  } catch (err) {
    showToast('error', err.message)
  } finally {
    btn.disabled = false; btn.textContent = 'Guardar cambios'
  }
}

// ── Delete modal ──────────────────────────────────────────────
function openDelete(id, name) {
  deleteId = id
  document.querySelector('#delete-sale-name').textContent = name
  document.querySelector('#delete-restore-stock').checked = false
  document.querySelector('#modal-delete').hidden = false
}

function closeDelete() {
  document.querySelector('#modal-delete').hidden = true
  deleteId = null
}

async function handleDelete() {
  if (!deleteId) return
  const btn          = document.querySelector('#delete-confirm')
  const restoreStock = document.querySelector('#delete-restore-stock').checked
  btn.disabled = true

  try {
    const res = await fetch(`/api/sales/${deleteId}`, {
      method: 'DELETE',
      body:   JSON.stringify({ restoreStock }),
    })
    if (!res.ok) throw new Error()
    closeDelete()
    await Promise.all([loadSales(), loadStats()])
    showToast('success', restoreStock ? 'Venta eliminada y stock restaurado' : 'Venta eliminada del historial')
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
    const pct = Math.round((values[i] / max) * 100)
    const val = values[i] > 0 ? priceK(values[i]) : ''
    return `
      <div class="chart-col">
        <div class="chart-bar-wrap">
          <div class="chart-bar ${values[i] > 0 ? 'has-data' : ''}" style="height:${Math.max(pct, 3)}%">
            ${val ? `<span class="chart-val">${val}</span>` : ''}
          </div>
        </div>
        <span class="chart-day ${day === today ? 'today' : ''}">${shortDay(day)}</span>
      </div>`
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
    const expandBtn = e.target.closest('.expand-btn[data-target]')
    if (expandBtn) {
      const detail = document.querySelector('#' + expandBtn.dataset.target)
      if (detail) { detail.hidden = !detail.hidden; expandBtn.textContent = detail.hidden ? '▼' : '▲' }
      return
    }
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

function toDatetimeLocal(iso) {
  if (!iso) return ''
  const d   = new Date(iso)
  const pad = n => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
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
  document.querySelector('#edit-add-item').addEventListener('click', () => addEmptyItemRow(productsCache))

  document.querySelector('#delete-confirm').addEventListener('click', handleDelete)
  document.querySelector('#delete-cancel').addEventListener('click', closeDelete)
  document.querySelector('#delete-overlay').addEventListener('click', closeDelete)
})
