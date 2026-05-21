const SHIPPING_NAMES = { 'correos': 'Correos CR', 'uber-rappi': 'Uber/Rappi' }
const STATUSES = ['pendiente','confirmado','en-proceso','enviado','entregado','cancelado']
const STATUS_LABELS = { 'pendiente':'Pendiente','confirmado':'Confirmado','en-proceso':'En proceso','enviado':'Enviado','entregado':'Entregado','cancelado':'Cancelado' }

let orders = []
let activeStatus = ''

async function loadOrders() {
  try {
    const qs  = activeStatus ? `?status=${activeStatus}` : ''
    const res = await fetch(`/api/orders${qs}`)
    if (!res.ok) throw new Error()
    orders = await res.json()
    document.querySelector('#orders-loading').hidden = true
    render(orders)
  } catch {
    document.querySelector('#orders-loading').hidden = true
    showToast('error', 'No se pudieron cargar los pedidos')
  }
}

function render(list) {
  const tbody = document.querySelector('#orders-body')
  const empty = document.querySelector('#orders-empty')
  if (!list.length) { empty.hidden = false; tbody.innerHTML = ''; return }
  empty.hidden = true

  tbody.innerHTML = list.map((order, i) => {
    const num     = String(i + 1).padStart(3, '0')
    const names   = [...new Set(order.items.map(it => it.name))].join(', ')
    const units   = order.items.reduce((s, it) => s + it.quantity, 0)
    const ship    = SHIPPING_NAMES[order.shipping?.method] || '—'
    const hasLoc  = order.shipping?.lat && order.shipping?.lng
    const locLink = hasLoc ? `<a href="https://maps.google.com/?q=${order.shipping.lat},${order.shipping.lng}" target="_blank" style="color:var(--amber);font-size:.8rem">📍 Ver</a>` : ''
    const note    = order.notes ? `<div style="color:var(--muted);font-size:.78rem;margin-top:3px">📝 ${esc(order.notes)}</div>` : ''

    return `
      <tr>
        <td style="color:var(--amber);font-family:'Cormorant Garamond',serif">#${num}</td>
        <td class="td-muted">${fmtDate(order.createdAt)}</td>
        <td>
          <div style="font-weight:500">${esc(order.customer?.name || '—')}</div>
          <div class="td-muted" style="font-size:.8rem">${esc(order.customer?.email || '')}</div>
        </td>
        <td>
          <div style="font-size:.88rem">${esc(names)}</div>
          <div class="td-muted" style="font-size:.78rem">${units} unidad${units !== 1 ? 'es' : ''}</div>
          ${note}
        </td>
        <td>
          <div style="font-size:.85rem">${ship}</div>
          ${locLink}
        </td>
        <td style="font-weight:500">${price(order.total)}</td>
        <td>
          <select class="status-select badge ${statusClass(order.status)}"
                  data-id="${esc(order._id)}"
                  data-current="${esc(order.status)}">
            ${STATUSES.map(s => `<option value="${s}" ${s === order.status ? 'selected' : ''}>${STATUS_LABELS[s]}</option>`).join('')}
          </select>
        </td>
      </tr>
    `
  }).join('')
}

function statusClass(s) {
  return `status-${s}`
}

async function updateStatus(id, status, selectEl) {
  try {
    const res = await fetch(`/api/orders/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ status }),
    })
    if (!res.ok) throw new Error()
    selectEl.dataset.current = status
    selectEl.className = `status-select badge ${statusClass(status)}`
    showToast('success', `Estado actualizado: ${STATUS_LABELS[status]}`)
  } catch {
    selectEl.value = selectEl.dataset.current
    showToast('error', 'No se pudo actualizar el estado')
  }
}

function setupFilters() {
  document.querySelectorAll('[data-status]').forEach(btn =>
    btn.addEventListener('click', () => {
      document.querySelectorAll('[data-status]').forEach(b => b.classList.remove('active'))
      btn.classList.add('active')
      activeStatus = btn.dataset.status
      loadOrders()
    })
  )
}

function price(n) { return '₡' + Number(n || 0).toLocaleString('es-CR') }
function esc(v)   { return String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c])) }
function fmtDate(iso) {
  if (!iso) return '—'
  const d = new Date(iso)
  return d.toLocaleDateString('es-CR', { day:'numeric', month:'short', year:'numeric' })
       + ' ' + d.toLocaleTimeString('es-CR', { hour:'2-digit', minute:'2-digit' })
}

function showToast(type, msg) {
  const t = document.createElement('div')
  t.className = `toast ${type}`
  t.textContent = msg
  document.querySelector('#toast-container').appendChild(t)
  setTimeout(() => { t.classList.add('fade-out'); setTimeout(() => t.remove(), 220) }, 3200)
}

document.addEventListener('DOMContentLoaded', () => {
  setupFilters()
  loadOrders()

  document.querySelector('#orders-body').addEventListener('change', e => {
    const sel = e.target.closest('select.status-select[data-id]')
    if (sel) updateStatus(sel.dataset.id, sel.value, sel)
  })
})
