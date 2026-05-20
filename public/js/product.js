const placeholderImage = 'data:image/svg+xml;utf8,' + encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600">
  <rect width="800" height="600" fill="#111111"/>
  <path d="M214 318c44-46 112-46 156 0m60 0c44-46 112-46 156 0" fill="none" stroke="#c9a96e" stroke-width="28" stroke-linecap="round"/>
  <path d="M370 318h60" stroke="#c9a96e" stroke-width="18" stroke-linecap="round"/>
</svg>`)

document.addEventListener('DOMContentLoaded', async () => {
  const id = new URLSearchParams(window.location.search).get('id')
  if (!id) {
    window.location = '/index.html'
    return
  }

  document.querySelector('#loading-state').hidden = false

  try {
    const response = await fetch(`/api/products/${id}`)
    if (response.status === 404) throw new Error('not-found')
    if (!response.ok) throw new Error('request-failed')
    const product = await response.json()
    renderProduct(product)
  } catch (error) {
    showError()
  }
})

function renderProduct(data) {
  const images = data.images?.length ? data.images : [placeholderImage]
  const mainImage = document.querySelector('#main-image')

  mainImage.src = images[0]
  mainImage.alt = data.name || 'Lente Solarilabs'
  text('#product-category', capitalize(data.category || 'Sin categoría'))
  text('#product-name', data.name || 'Sin nombre')
  text('#product-price', formatPrice(data.price))
  text('#product-description', data.description || 'Sin descripción disponible.')
  text('#spec-brand', data.brand || 'Solarilabs')
  text('#spec-sku', data.sku || '—')
  text('#spec-frame', data.frameColor || '—')
  text('#spec-lens', data.lensColor || '—')
  text('#spec-material', data.material || '—')
  text('#spec-uv', data.uvProtection || 'UV400')
  text('#spec-polarized', data.polarized ? 'Sí ✓' : 'No')

  const compare = document.querySelector('#product-compare')
  compare.hidden = !data.comparePrice
  compare.textContent = data.comparePrice ? formatPrice(data.comparePrice) : ''

  renderStockBadge(Number(data.stock || 0))
  renderThumbnails(images, mainImage)

  document.querySelector('#breadcrumb').textContent = `Inicio / ${capitalize(data.category || 'Categoría')} / ${data.name || 'Producto'}`
  document.querySelector('#edit-link').href = `/admin.html?edit=${data._id}`
  document.querySelector('#loading-state').hidden = true
  document.querySelector('#product-detail').hidden = false
}

function renderThumbnails(images, mainImage) {
  const thumbnails = document.querySelector('#thumbnails')
  thumbnails.innerHTML = images.slice(0, 3).map((src, index) => `
    <img class="thumbnail ${index === 0 ? 'active' : ''}" src="${escapeAttr(src)}" alt="Imagen ${index + 1}" data-src="${escapeAttr(src)}">
  `).join('')

  thumbnails.addEventListener('click', (event) => {
    const thumbnail = event.target.closest('.thumbnail')
    if (!thumbnail) return
    mainImage.src = thumbnail.dataset.src
    thumbnails.querySelectorAll('.thumbnail').forEach((item) => item.classList.remove('active'))
    thumbnail.classList.add('active')
  }, { once: false })
}

function renderStockBadge(stock) {
  const badge = document.querySelector('#stock-badge')
  badge.className = ''

  if (stock === 0) {
    badge.textContent = 'Agotado'
    badge.classList.add('badge-danger')
  } else if (stock < 5) {
    badge.textContent = `Últimas ${stock} unidades`
    badge.classList.add('badge-warning')
  } else {
    badge.textContent = `${stock} disponibles`
    badge.classList.add('badge-success')
  }
}

function showError() {
  document.querySelector('#loading-state').hidden = true
  document.querySelector('#product-detail').hidden = true
  document.querySelector('#error-state').hidden = false
}

function text(selector, value) {
  document.querySelector(selector).textContent = value
}

function formatPrice(number) {
  return `₡${Number(number || 0).toLocaleString('es-CR')}`
}

function capitalize(value) {
  return value ? value.charAt(0).toUpperCase() + value.slice(1) : ''
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (char) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  }[char]))
}

function escapeAttr(value) {
  return escapeHtml(value).replace(/`/g, '&#096;')
}
