// ── Constants ─────────────────────────────────────────────────
const LENS = {
  rojo:     { label: 'Noche',  time: '1–2h antes de dormir', hex: '#c83030', barClass: 'bar-rojo',    timingClass: 'timing-rojo',    dotClass: 'dot-rojo' },
  naranja:  { label: 'Tarde',  time: 'Desde las 5pm',        hex: '#d96020', barClass: 'bar-naranja',  timingClass: 'timing-naranja',  dotClass: 'dot-naranja' },
  amarillo: { label: 'Día',    time: 'Uso diurno',            hex: '#c9a015', barClass: 'bar-amarillo', timingClass: 'timing-amarillo', dotClass: 'dot-amarillo' },
}

const LENS_DESC = {
  rojo: {
    title: 'Filtro Nocturno — Bloqueo total',
    desc:  'Bloquean el espectro completo de luz azul. Úsalos 1–2 horas antes de dormir para que el cerebro produzca melatonina de forma natural y logres un sueño profundo y reparador.',
    when:  '🌙 Noche · 1–2h antes de dormir',
  },
  naranja: {
    title: 'Filtro Vespertino — Bloqueo alto',
    desc:  'Reducen significativamente el impacto de las pantallas a partir de las 5pm. Preparan gradualmente tu ritmo circadiano sin afectar tu productividad en la tarde.',
    when:  '🌅 Tarde · Desde las 5pm',
  },
  amarillo: {
    title: 'Filtro Diurno — Bloqueo moderado',
    desc:  'Ideales para uso continuo frente a pantallas durante el día. Reducen la fatiga visual y el esfuerzo ocular sin alterar tu nivel de energía ni tu ciclo de sueño.',
    when:  '☀️ Día · Uso frente a pantallas',
  },
}

const FRAME_NAMES = {
  'negro':              'Marco Negro',
  'transparente-claro': 'Marco Transparente Claro',
  'transparente-oscuro':'Marco Transparente Oscuro',
}

const placeholder = 'data:image/svg+xml;utf8,' + encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600"><rect width="800" height="600" fill="#181310"/><path d="M214 318c44-46 112-46 156 0m60 0c44-46 112-46 156 0" fill="none" stroke="#d4892a" stroke-width="28" stroke-linecap="round"/><path d="M370 318h60" stroke="#d4892a" stroke-width="18" stroke-linecap="round"/></svg>'
)

// ── State ──────────────────────────────────────────────────────
let products            = []
let filters             = { lens: '', frame: '' }
let currentModalProduct = null

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
  const frame = FRAME_NAMES[p.frameColor] || (p.frameColor || '')
  const stock = Number(p.stock || 0)

  const stockTag = stock === 0
    ? '<span class="stock-tag stock-out">Sin stock</span>'
    : stock < 5
      ? `<span class="stock-tag stock-low">${stock} disponibles</span>`
      : `<span class="stock-tag stock-ok">${stock} disponibles</span>`

  const btnDisabled = stock === 0 ? 'disabled' : ''
  const btnLabel    = stock === 0 ? 'Sin stock' : 'Agregar al carrito'

  return `
    <article class="product-card" data-product-id="${esc(p._id)}">
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

// ── Product detail modal ──────────────────────────────────────
function openProductModal(product) {
  currentModalProduct = product
  const info  = LENS[product.lensColor]     || {}
  const desc  = LENS_DESC[product.lensColor] || {}
  const stock = Number(product.stock || 0)
  const img   = product.images?.[0] || placeholder
  const frame = FRAME_NAMES[product.frameColor] || product.frameColor || ''

  // Image + lens bar
  document.querySelector('#detail-img').src = img
  document.querySelector('#detail-img').alt = product.name
  const bar = document.querySelector('#detail-lens-bar')
  bar.className = `card-lens-bar ${info.barClass || ''}`

  // Timing
  const timing = document.querySelector('#detail-timing')
  timing.className = `card-timing ${info.timingClass || ''}`
  timing.innerHTML = `<span class="lens-dot ${info.dotClass || ''}"></span>${esc(desc.when || info.label || '')}`

  // Name + meta
  document.querySelector('#detail-name').textContent       = product.name
  document.querySelector('#detail-frame-lens').textContent = `${frame} · Lente ${product.lensColor || ''}`

  // Lens info box
  const infoBox = document.querySelector('#detail-lens-info')
  infoBox.hidden = !desc.title
  infoBox.innerHTML = desc.title ? `
    <div class="detail-lens-box-title">${esc(desc.title)}</div>
    <div class="detail-lens-box-desc">${esc(desc.desc)}</div>
  ` : ''

  // Description
  const detailDesc = document.querySelector('#detail-desc')
  detailDesc.textContent = product.description || ''
  detailDesc.hidden = !product.description

  // Price + stock
  document.querySelector('#detail-price').textContent = formatPrice(product.price)
  const stockEl = document.querySelector('#detail-stock')
  if (stock === 0)     stockEl.innerHTML = '<span class="stock-tag stock-out">Sin stock</span>'
  else if (stock < 5)  stockEl.innerHTML = `<span class="stock-tag stock-low">${stock} disp.</span>`
  else                 stockEl.innerHTML = `<span class="stock-tag stock-ok">${stock} disponibles</span>`

  // Button
  const addBtn = document.querySelector('#modal-add-btn')
  addBtn.disabled    = stock === 0
  addBtn.textContent = stock === 0 ? 'Sin stock' : 'Agregar al carrito'
  addBtn.dataset.id  = product._id

  document.querySelector('#modal-product').hidden = false
}

function closeProductModal() {
  document.querySelector('#modal-product').hidden = true
  currentModalProduct = null
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

  // Grid clicks — diferenciar botón "Agregar" vs. click en la card
  document.querySelector('#grid').addEventListener('click', e => {
    // Click en botón "Agregar al carrito"
    const btn = e.target.closest('.add-to-cart-btn[data-id]')
    if (btn) {
      if (!btn.disabled) {
        const product = products.find(p => p._id === btn.dataset.id)
        if (product) addToCart(product)
      }
      return
    }
    // Click en la card → abrir modal
    const card = e.target.closest('.product-card[data-product-id]')
    if (card) {
      const product = products.find(p => p._id === card.dataset.productId)
      if (product) openProductModal(product)
    }
  })

  // Modal — cerrar
  document.querySelector('#product-overlay')?.addEventListener('click', closeProductModal)
  document.querySelector('#modal-close')?.addEventListener('click', closeProductModal)
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeProductModal() })

  // Modal — Agregar al carrito
  document.querySelector('#modal-add-btn')?.addEventListener('click', () => {
    if (currentModalProduct) {
      addToCart(currentModalProduct)
      closeProductModal()
    }
  })
})
