const LENS = {
  rojo:     { label: 'Noche',  time: '1–2h antes de dormir', hex: '#c83030', barClass: 'bar-rojo',    timingClass: 'timing-rojo',    dotClass: 'dot-rojo' },
  naranja:  { label: 'Tarde',  time: 'Desde las 5pm',        hex: '#d96020', barClass: 'bar-naranja',  timingClass: 'timing-naranja',  dotClass: 'dot-naranja' },
  amarillo: { label: 'Día',    time: 'Uso diurno',            hex: '#c9a015', barClass: 'bar-amarillo', timingClass: 'timing-amarillo', dotClass: 'dot-amarillo' },
}

const placeholder = 'data:image/svg+xml;utf8,' + encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600"><rect width="800" height="600" fill="#181310"/><path d="M214 318c44-46 112-46 156 0m60 0c44-46 112-46 156 0" fill="none" stroke="#d4892a" stroke-width="28" stroke-linecap="round"/><path d="M370 318h60" stroke="#d4892a" stroke-width="18" stroke-linecap="round"/></svg>'
)

let products = []
let filters  = { lens: '', frame: '' }
let selling  = null   // { product, maxQty }

// ── Fetch & render ────────────────────────────────────────────
async function loadProducts() {
  document.querySelector('#loading').hidden = false
  document.querySelector('#grid').innerHTML = ''
  document.querySelector('#empty').hidden = true

  const params = new URLSearchParams()
  if (filters.lens)  params.set('lensColor',  filters.lens)
  if (filters.frame) params.set('frameColor', filters.frame)

  try {
    const res = await fetch('/api/products?' + params)
    if (!res.ok) throw new Error()
    products = await res.json()
  } catch {
    products = []
    showToast('error', 'No se pudo cargar el inventario')
  } finally {
    document.querySelector('#loading').hidden = true
  }

  render()
}

function render() {
  const grid  = document.querySelector('#grid')
  const empty = document.querySelector('#empty')

  if (!products.length) { empty.hidden = false; grid.innerHTML = ''; return }
  empty.hidden = true
  grid.innerHTML = products.map(card).join('')
}

function card(p) {
  const info  = LENS[p.lensColor] || {}
  const img   = p.images?.[0] || placeholder
  const frameNames = { 'negro': 'Marco Negro', 'transparente-claro': 'Marco Transp. Claro', 'transparente-oscuro': 'Marco Transp. Oscuro' }
  const frame = frameNames[p.frameColor] || p.frameColor
  const stock = Number(p.stock || 0)

  const stockTag = stock === 0
    ? '<span class="stock-tag stock-out">Sin stock</span>'
    : stock < 5
      ? `<span class="stock-tag stock-low">${stock} disponibles</span>`
      : `<span class="stock-tag stock-ok">${stock} disponibles</span>`

  return `
    <article class="product-card">
      <div class="card-img-wrap">
        <img src="${esc(img)}" alt="${esc(p.name)}" loading="lazy">
        <div class="card-lens-bar ${info.barClass || ''}"></div>
      </div>
      <div class="card-body">
        <div class="card-timing ${info.timingClass || ''}">
          <span class="lens-dot ${info.dotClass || ''}"></span>
          ${esc(info.label || '')} · ${esc(info.time || '')}
        </div>
        <h3 class="card-name">${esc(p.name)}</h3>
        <p class="card-desc">${esc(p.description || '')}</p>
        <div class="card-footer">
          <div>
            <span class="card-price">${price(p.price)}</span>
            ${p.comparePrice ? `<span class="card-compare" style="margin-left:8px">${price(p.comparePrice)}</span>` : ''}
          </div>
          ${stockTag}
        </div>
        <button class="sell-btn"
          data-id="${esc(p._id)}"
          ${stock === 0 ? 'disabled' : ''}>
          ${stock === 0 ? 'Sin stock' : 'Vender'}
        </button>
      </div>
    </article>
  `
}

// ── Sell modal ────────────────────────────────────────────────
function openSell(id) {
  const p = products.find(x => x._id === id)
  if (!p || p.stock === 0) return

  selling = { product: p, maxQty: p.stock }

  document.querySelector('#sell-img').src        = p.images?.[0] || placeholder
  document.querySelector('#sell-name').textContent  = p.name
  document.querySelector('#sell-sub').textContent   = `Marco ${p.frameColor} · Lente ${p.lensColor}`
  document.querySelector('#sell-price-unit').textContent = price(p.price) + ' / unidad'

  const qty = document.querySelector('#qty-val')
  qty.value = 1
  qty.max   = p.stock

  updateTotal(1, p.price)
  document.querySelector('#modal-sell').hidden = false
}

function closeSell() {
  document.querySelector('#modal-sell').hidden = true
  selling = null
}

function updateTotal(qty, unitPrice) {
  document.querySelector('#sell-total').textContent = price(qty * unitPrice)
}

async function confirmSell() {
  if (!selling) return
  const qty = Math.min(parseInt(document.querySelector('#qty-val').value) || 1, selling.maxQty)

  const btn = document.querySelector('#sell-confirm')
  btn.disabled = true
  btn.textContent = 'Registrando…'

  try {
    const res = await fetch('/api/sales', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items: [{ productId: selling.product._id, quantity: qty }] }),
    })

    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.error || 'Error al registrar')
    }

    closeSell()
    showToast('success', `Venta registrada · ${qty} × ${selling?.product?.name || ''}`)
    await loadProducts()
  } catch (err) {
    showToast('error', err.message)
  } finally {
    btn.disabled = false
    btn.textContent = 'Confirmar venta'
  }
}

// ── Filters ───────────────────────────────────────────────────
function setupFilters() {
  document.querySelectorAll('[data-lens]').forEach(btn =>
    btn.addEventListener('click', () => {
      document.querySelectorAll('[data-lens]').forEach(b => b.classList.remove('active'))
      btn.classList.add('active')
      filters.lens = btn.dataset.lens
      loadProducts()
    })
  )

  // Frame pills — separate group (no data-lens so we handle them separately)
  document.querySelectorAll('[data-frame]').forEach(btn =>
    btn.addEventListener('click', () => {
      document.querySelectorAll('[data-frame]').forEach(b => b.classList.remove('active'))
      btn.classList.add('active')
      filters.frame = btn.dataset.frame
      loadProducts()
    })
  )
}

// ── Utils ─────────────────────────────────────────────────────
function price(n) { return '₡' + Number(n || 0).toLocaleString('es-CR') }
function esc(v)   { return String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c])) }

function showToast(type, msg) {
  const t = document.createElement('div')
  t.className = `toast ${type}`
  t.textContent = msg
  document.querySelector('#toast-container').appendChild(t)
  setTimeout(() => { t.classList.add('fade-out'); setTimeout(() => t.remove(), 220) }, 3200)
}

// ── Init ──────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  setupFilters()
  loadProducts()

  // Sell button (delegated)
  document.querySelector('#grid').addEventListener('click', e => {
    const btn = e.target.closest('.sell-btn[data-id]')
    if (btn && !btn.disabled) openSell(btn.dataset.id)
  })

  // Modal controls
  document.querySelector('#sell-cancel').addEventListener('click', closeSell)
  document.querySelector('#sell-overlay').addEventListener('click', closeSell)
  document.querySelector('#sell-confirm').addEventListener('click', confirmSell)

  document.querySelector('#qty-minus').addEventListener('click', () => {
    const inp = document.querySelector('#qty-val')
    const val = Math.max(1, parseInt(inp.value) - 1)
    inp.value = val
    if (selling) updateTotal(val, selling.product.price)
  })

  document.querySelector('#qty-plus').addEventListener('click', () => {
    const inp = document.querySelector('#qty-val')
    const max = selling?.maxQty || 99
    const val = Math.min(max, parseInt(inp.value) + 1)
    inp.value = val
    if (selling) updateTotal(val, selling.product.price)
  })

  document.querySelector('#qty-val').addEventListener('input', e => {
    const max = selling?.maxQty || 99
    const val = Math.min(max, Math.max(1, parseInt(e.target.value) || 1))
    e.target.value = val
    if (selling) updateTotal(val, selling.product.price)
  })
})
