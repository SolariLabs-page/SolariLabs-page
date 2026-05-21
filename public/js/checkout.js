// ── Constants ─────────────────────────────────────────────────
const WHATSAPP_NUMBER = '50684797961'

const LENS_NAMES = {
  rojo:     'Rojo (Noche)',
  naranja:  'Naranja (Tarde)',
  amarillo: 'Amarillo (Día)',
}

const FRAME_NAMES = {
  'negro':              'Negro',
  'transparente-claro': 'Transp. Claro',
  'transparente-oscuro':'Transp. Oscuro',
}

const SHIPPING_NAMES = {
  'correos':    'Correos de Costa Rica',
  'uber-rappi': 'Uber Flash / Rappi',
}

const placeholder = 'data:image/svg+xml;utf8,' + encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600"><rect width="800" height="600" fill="#181310"/><path d="M214 318c44-46 112-46 156 0m60 0c44-46 112-46 156 0" fill="none" stroke="#d4892a" stroke-width="28" stroke-linecap="round"/><path d="M370 318h60" stroke="#d4892a" stroke-width="18" stroke-linecap="round"/></svg>'
)

// ── State ──────────────────────────────────────────────────────
let locationLat = null
let locationLng = null

// ── Cart helpers ───────────────────────────────────────────────
function getCart() {
  try { return JSON.parse(localStorage.getItem('sl_cart') || '[]') } catch { return [] }
}

function clearCart() {
  localStorage.removeItem('sl_cart')
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

// ── Cart badge ────────────────────────────────────────────────
function updateCartBadge() {
  const cart  = getCart()
  const total = cart.reduce((sum, item) => sum + (item.quantity || 1), 0)
  const el    = document.querySelector('#cart-count')
  if (!el) return
  el.textContent = total
  el.dataset.count = total
}

// ── Render cart summary ───────────────────────────────────────
function renderCart(cart) {
  const container = document.querySelector('#order-items')
  const totalEl   = document.querySelector('#order-total')
  if (!container) return

  let total = 0

  container.innerHTML = cart.map(item => {
    const subtotal = (item.price || 0) * (item.quantity || 1)
    total += subtotal
    const img  = item.image || placeholder
    const lens  = LENS_NAMES[item.lensColor]  || item.lensColor  || ''
    const frame = FRAME_NAMES[item.frameColor] || item.frameColor || ''
    const meta  = [frame, lens].filter(Boolean).join(' · ')

    return `
      <div class="order-item">
        <img class="order-thumb" src="${esc(img)}" alt="${esc(item.name)}" onerror="this.src='${placeholder}'">
        <div class="order-item-info">
          <div class="order-item-name">${esc(item.name)}</div>
          ${meta ? `<div class="order-item-meta">${esc(meta)}</div>` : ''}
          <div class="order-item-meta">Cantidad: ${item.quantity || 1}</div>
        </div>
        <div style="font-weight:500;white-space:nowrap">${formatPrice(subtotal)}</div>
      </div>
    `
  }).join('')

  if (totalEl) totalEl.textContent = formatPrice(total)
}

// ── Shipping option highlight ─────────────────────────────────
function setupShippingOptions() {
  const radios   = document.querySelectorAll('input[name="shipping"]')
  const optEls   = document.querySelectorAll('.shipping-option')
  const locWrap  = document.querySelector('#location-wrap')

  const addrWrap = document.querySelector('#address-wrap')

  radios.forEach(radio => {
    radio.addEventListener('change', () => {
      optEls.forEach(el => el.classList.remove('selected'))
      const parent = radio.closest('.shipping-option')
      if (parent) parent.classList.add('selected')

      // Correos → campo de dirección
      if (addrWrap) addrWrap.hidden = radio.value !== 'correos'
      // Uber/Rappi → botón de ubicación GPS
      if (locWrap)  locWrap.hidden  = radio.value !== 'uber-rappi'
    })
  })
}

// ── Geolocation ───────────────────────────────────────────────
function setupLocationBtn() {
  const btn    = document.querySelector('#location-btn')
  const status = document.querySelector('#location-status')
  if (!btn || !status) return

  btn.addEventListener('click', () => {
    if (!navigator.geolocation) {
      status.textContent = 'Tu navegador no soporta geolocalización'
      status.style.color = 'var(--danger)'
      return
    }

    btn.disabled = true
    btn.textContent = 'Obteniendo ubicación…'
    status.textContent = ''

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        locationLat = pos.coords.latitude
        locationLng = pos.coords.longitude
        status.innerHTML = '<span style="color:var(--success)">Ubicación obtenida ✓</span>'
        btn.disabled = false
        btn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="10" r="3"/><path d="M12 2a8 8 0 0 1 8 8c0 5.25-8 13-8 13S4 15.25 4 10a8 8 0 0 1 8-8z"/></svg> Actualizar ubicación`
      },
      (err) => {
        status.textContent = 'No se pudo obtener la ubicación'
        status.style.color = 'var(--danger)'
        btn.disabled = false
        btn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="10" r="3"/><path d="M12 2a8 8 0 0 1 8 8c0 5.25-8 13-8 13S4 15.25 4 10a8 8 0 0 1 8-8z"/></svg> Compartir mi ubicación`
      }
    )
  })
}

// ── Build WhatsApp message ────────────────────────────────────
function buildWhatsAppMessage(order, customer) {
  const cart    = order.items || []
  const total   = cart.reduce((s, i) => s + (i.price || 0) * (i.quantity || 1), 0)
  const ref     = (order._id || order.id || '').slice(-6).toUpperCase()

  const itemLines = cart.map(item => {
    const subtotal = (item.price || 0) * (item.quantity || 1)
    return `  • ${item.name} x${item.quantity || 1}  ${formatPrice(subtotal)}`
  }).join('\n')

  const shippingLabel = SHIPPING_NAMES[order.shipping?.method] || '—'
  const address       = order.shipping?.address
  const hasLocation   = locationLat && locationLng

  let envioLine = `Envío: ${shippingLabel}`
  if (address)     envioLine += `\nDirección: ${address}`
  if (hasLocation) envioLine += `\nUbicación: https://maps.google.com/?q=${locationLat},${locationLng}`

  const notesLine = order.notes ? `\nNota: ${order.notes}` : ''

  return [
    `Nuevo pedido SolariLab`,
    ``,
    `Cliente: ${customer.name}`,
    `Correo: ${customer.email}`,
    ``,
    `Productos:`,
    itemLines,
    ``,
    `Total: ${formatPrice(total)}`,
    ``,
    envioLine,
    notesLine,
    ``,
    `Ref: ${ref}`,
  ].filter(l => l !== null).join('\n')
}

// ── Handle checkout submit ────────────────────────────────────
async function handleCheckout() {
  const customer  = getCustomer()
  const cart      = getCart()
  const submitBtn = document.querySelector('#submit-btn')

  // Validate shipping
  const shippingRadio = document.querySelector('input[name="shipping"]:checked')
  if (!shippingRadio) {
    showToast('error', 'Seleccioná un método de envío')
    return
  }

  const shippingMethod = shippingRadio.value
  const notes          = document.querySelector('#notes')?.value?.trim() || ''

  const shipping = { method: shippingMethod }
  if (shippingMethod === 'correos') {
    const addr = document.querySelector('#shipping-address')?.value?.trim()
    if (!addr) { showToast('error', 'Ingresá la dirección de entrega'); return }
    shipping.address = addr
  }
  if (locationLat && locationLng) {
    shipping.lat = locationLat
    shipping.lng = locationLng
  }

  const payload = {
    items:    cart.map(item => ({ productId: item.productId, quantity: item.quantity || 1 })),
    shipping,
    notes,
  }

  submitBtn.disabled    = true
  submitBtn.textContent = 'Procesando…'

  try {
    const res = await fetch('api/orders', {
      method:  'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': 'Bearer ' + customer.token,
      },
      body: JSON.stringify(payload),
    })

    const text = await res.text()
    let data = {}
    try { data = JSON.parse(text) } catch { /* non-JSON */ }

    if (!res.ok) throw new Error(data.error || `Error del servidor (${res.status})`)

    // Merge cart items into order response for WhatsApp message
    const orderForMsg = {
      ...data,
      items:    cart,
      shipping: { ...shipping },
      notes,
    }

    const msg     = buildWhatsAppMessage(orderForMsg, customer)
    const waUrl   = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(msg)}`

    clearCart()
    window.location.href = waUrl
  } catch (err) {
    showToast('error', err.message || 'No se pudo procesar el pedido')
    submitBtn.disabled    = false
    submitBtn.textContent = 'Realizar pedido →'
  }
}

// ── Customer nav ──────────────────────────────────────────────
function getCustomer() {
  try { return JSON.parse(localStorage.getItem('sl_customer') || 'null') } catch { return null }
}

function setupCustomerNav() {
  const desktopNav = document.querySelector('#customer-nav-desktop')
  if (!desktopNav) return

  const customer = getCustomer()
  if (customer && customer.name) {
    desktopNav.innerHTML = `
      <span class="customer-greeting">Hola, ${esc(customer.name)}</span>
      <button class="btn btn-ghost btn-sm" id="btn-customer-logout">Salir</button>
    `
    document.querySelector('#btn-customer-logout')?.addEventListener('click', () => {
      localStorage.removeItem('sl_customer')
      window.location.href = 'shop.html'
    })
  }
}

// ── Init ──────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  const cart     = getCart()
  const customer = getCustomer()

  // Guard: empty cart
  if (!cart.length) {
    window.location.replace('shop.html')
    return
  }

  // Guard: not logged in
  if (!customer || !customer.token) {
    window.location.replace('shop-login.html?redirect=checkout.html')
    return
  }

  updateCartBadge()
  setupCustomerNav()
  renderCart(cart)
  setupShippingOptions()
  setupLocationBtn()

  // Cart button stays on checkout page (same page)
  document.querySelector('#cart-btn')?.addEventListener('click', () => {
    // Already on checkout, just scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' })
  })

  document.querySelector('#submit-btn')?.addEventListener('click', handleCheckout)
})
