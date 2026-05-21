// ── Constants ─────────────────────────────────────────────────
const LENS = {
  rojo:     { label: 'Noche',  time: '1–2h antes de dormir', hex: '#c83030', barClass: 'bar-rojo',    timingClass: 'timing-rojo',    dotClass: 'dot-rojo' },
  naranja:  { label: 'Tarde',  time: 'Desde las 5pm',        hex: '#d96020', barClass: 'bar-naranja',  timingClass: 'timing-naranja',  dotClass: 'dot-naranja' },
  amarillo: { label: 'Día',    time: 'Uso diurno',            hex: '#c9a015', barClass: 'bar-amarillo', timingClass: 'timing-amarillo', dotClass: 'dot-amarillo' },
}

const placeholder = 'data:image/svg+xml;utf8,' + encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600"><rect width="800" height="600" fill="#181310"/><path d="M214 318c44-46 112-46 156 0m60 0c44-46 112-46 156 0" fill="none" stroke="#d4892a" stroke-width="28" stroke-linecap="round"/><path d="M370 318h60" stroke="#d4892a" stroke-width="18" stroke-linecap="round"/></svg>'
)

// ── State ──────────────────────────────────────────────────────
let products = []
let filters  = { lens: '', frame: '' }

// ── Cart helpers ───────────────────────────────────────────────
function getCart() {
  try { return JSON.parse(localStorage.getItem('sl_cart') || '[]') } catch { return [] }
}

function saveCart(cart) {
  localStorage.setItem('sl_cart', JSON.stringify(cart))
}

function addToCart(product) {
  const cart = getCart()
  const existing = cart.find(item => item.productId === product._id)

  if (existing) {
    existing.quantity = (existing.quantity || 1) + 1
  } else {
    cart.push({
      productId:  product._id,
      name:       product.name,
      frameColor: product.frameColor || '',
      lensColor:  product.lensColor  || '',
      price:      product.price,
      quantity:   1,
      image:      product.images?.[0] || '',
    })
  }

  saveCart(cart)
  updateCartBadge()
  showToast('success', `${esc(product.name)} agregado al carrito`)
}

function updateCartBadge() {
  const cart  = getCart()
  const total = cart.reduce((sum, item) => sum + (item.quantity || 1), 0)
  const el    = document.querySelector('#cart-count')
  if (!el) return
  el.textContent = total
  el.dataset.count = total
}

// ── Fetch & render ────────────────────────────────────────────
async function fetchProducts() {
  document.querySelector('#loading').hidden = false
  document.querySelector('#grid').innerHTML = ''
  document.querySelector('#empty').hidden = true

  const params = new URLSearchParams()
  if (filters.lens)  params.set('lensColor',  filters.lens)
  if (filters.frame) params.set('frameColor', filters.frame)

  try {
    const res = await fetch('api/products?' + params)
    if (!res.ok) throw new Error()
    products = await res.json()
  } catch {
    products = []
    showToast('error', 'No se pudo cargar el catálogo')
  } finally {
    document.querySelector('#loading').hidden = true
  }

  renderProducts()
}

function renderProducts() {
  const grid  = document.querySelector('#grid')
  const empty = document.querySelector('#empty')

  if (!products.length) { empty.hidden = false; grid.innerHTML = ''; return }
  empty.hidden = true
  grid.innerHTML = products.map(shopCard).join('')
}

function shopCard(p) {
  const info  = LENS[p.lensColor] || {}
  const img   = p.images?.[0] || placeholder
  const frameNames = {
    'negro':              'Marco Negro',
    'transparente-claro': 'Marco Transp. Claro',
    'transparente-oscuro':'Marco Transp. Oscuro',
  }
  const frame = frameNames[p.frameColor] || (p.frameColor || '')
  const stock = Number(p.stock || 0)

  const stockTag = stock === 0
    ? '<span class="stock-tag stock-out">Sin stock</span>'
    : stock < 5
      ? `<span class="stock-tag stock-low">${stock} disponibles</span>`
      : `<span class="stock-tag stock-ok">${stock} disponibles</span>`

  const btnDisabled = stock === 0 ? 'disabled' : ''
  const btnLabel    = stock === 0 ? 'Sin stock' : 'Agregar al carrito'

  return `
    <article class="product-card">
      <div class="card-img-wrap">
        <img src="${esc(img)}" alt="${esc(p.name)}" loading="lazy">
        <div class="card-lens-bar ${info.barClass || ''}"></div>
      </div>
      <div class="card-body">
        <div class="card-timing ${info.timingClass || ''}">
          <span class="lens-dot ${info.dotClass || ''}"></span>
          ${esc(info.label || '')}${info.time ? ' · ' + esc(info.time) : ''}
        </div>
        <h3 class="card-name">${esc(p.name)}</h3>
        <p class="card-desc">${esc(p.description || '')}</p>
        <div class="card-footer">
          <div>
            <span class="card-price">${formatPrice(p.price)}</span>
            ${p.comparePrice ? `<span class="card-compare" style="margin-left:8px">${formatPrice(p.comparePrice)}</span>` : ''}
          </div>
          ${stockTag}
        </div>
        <button class="sell-btn add-to-cart-btn"
          data-id="${esc(p._id)}"
          ${btnDisabled}>
          ${btnLabel}
        </button>
      </div>
    </article>
  `
}

// ── Filters ───────────────────────────────────────────────────
function setupFilters() {
  document.querySelectorAll('[data-lens]').forEach(btn =>
    btn.addEventListener('click', () => {
      document.querySelectorAll('[data-lens]').forEach(b => b.classList.remove('active'))
      btn.classList.add('active')
      filters.lens = btn.dataset.lens
      fetchProducts()
    })
  )

  document.querySelectorAll('[data-frame]').forEach(btn =>
    btn.addEventListener('click', () => {
      document.querySelectorAll('[data-frame]').forEach(b => b.classList.remove('active'))
      btn.classList.add('active')
      filters.frame = btn.dataset.frame
      fetchProducts()
    })
  )
}

// ── Customer nav ──────────────────────────────────────────────
function setupCustomerNav() {
  const desktopNav = document.querySelector('#customer-nav-desktop')
  if (!desktopNav) return

  let customer = null
  try { customer = JSON.parse(localStorage.getItem('sl_customer') || 'null') } catch { /* */ }

  if (customer && customer.name) {
    desktopNav.innerHTML = `
      <span class="customer-greeting">Hola, ${esc(customer.name)}</span>
      <button class="btn btn-ghost btn-sm" id="btn-customer-logout">Salir</button>
    `
    document.querySelector('#btn-customer-logout')?.addEventListener('click', () => {
      localStorage.removeItem('sl_customer')
      window.location.reload()
    })
  } else {
    desktopNav.innerHTML = `
      <a href="shop-login.html" class="btn btn-ghost btn-sm">Entrar</a>
    `
  }
}

// ── Utils ─────────────────────────────────────────────────────
function formatPrice(n) { return '₡' + Number(n || 0).toLocaleString('es-CR') }
function esc(v) {
  return String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]))
}

function showToast(type, msg) {
  const container = document.querySelector('#toast-container')
  if (!container) return
  const t = document.createElement('div')
  t.className = `toast ${type}`
  t.textContent = msg
  container.appendChild(t)
  setTimeout(() => { t.classList.add('fade-out'); setTimeout(() => t.remove(), 220) }, 3200)
}

// ── Init ──────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  updateCartBadge()
  setupCustomerNav()
  setupFilters()
  fetchProducts()

  // Cart button → checkout
  document.querySelector('#cart-btn')?.addEventListener('click', () => {
    window.location.href = 'checkout.html'
  })

  // Add to cart (delegated)
  document.querySelector('#grid').addEventListener('click', e => {
    const btn = e.target.closest('.add-to-cart-btn[data-id]')
    if (!btn || btn.disabled) return
    const product = products.find(p => p._id === btn.dataset.id)
    if (product) addToCart(product)
  })
})
