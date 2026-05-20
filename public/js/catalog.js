const API = ''

let products = []
let filters = { category: '', gender: '', polarized: false, search: '', sort: 'newest' }

const placeholderImage = 'data:image/svg+xml;utf8,' + encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600">
  <rect width="800" height="600" fill="#111111"/>
  <path d="M214 318c44-46 112-46 156 0m60 0c44-46 112-46 156 0" fill="none" stroke="#c9a96e" stroke-width="28" stroke-linecap="round"/>
  <path d="M370 318h60" stroke="#c9a96e" stroke-width="18" stroke-linecap="round"/>
</svg>`)

async function fetchProducts() {
  const loading = document.querySelector('#loading')
  loading.hidden = false

  const params = new URLSearchParams()
  if (filters.category) params.set('category', filters.category)
  if (filters.gender) params.set('gender', filters.gender)
  if (filters.polarized) params.set('polarized', 'true')
  if (filters.search) params.set('search', filters.search)
  if (filters.sort) params.set('sort', filters.sort)

  try {
    const response = await fetch(`${API}/api/products?${params.toString()}`)
    if (!response.ok) throw new Error('No se pudo cargar el catálogo')
    products = await response.json()
    renderProducts()
  } catch (error) {
    products = []
    renderProducts()
    console.error(error)
  } finally {
    loading.hidden = true
  }
}

function renderProducts() {
  const grid = document.querySelector('#products-grid')
  const empty = document.querySelector('#empty-state')
  const count = document.querySelector('.results-count')

  let list = [...products]
  if (filters.sort === 'price_asc') list.sort((a, b) => Number(a.price || 0) - Number(b.price || 0))
  if (filters.sort === 'price_desc') list.sort((a, b) => Number(b.price || 0) - Number(a.price || 0))

  count.textContent = `${list.length} ${list.length === 1 ? 'lente encontrado' : 'lentes encontrados'}`
  empty.hidden = list.length > 0
  grid.innerHTML = list.map(productCard).join('')
}

function productCard(product) {
  const image = product.images?.[0] || placeholderImage
  const stockBadge = product.stock === 0
    ? '<span class="badge badge-danger">Agotado</span>'
    : product.stock < 5
      ? '<span class="badge badge-warning">Poco stock</span>'
      : ''

  return `
    <article class="product-card" role="link" tabindex="0" data-id="${escapeHtml(product._id)}">
      <img src="${escapeAttr(image)}" alt="${escapeAttr(product.name || 'Lente Solarilabs')}">
      <div class="card-body">
        <span class="category-label">${escapeHtml(capitalize(product.category || 'Sin categoría'))}</span>
        <h3 class="product-name">${escapeHtml(product.name || 'Sin nombre')}</h3>
        <div class="badges">
          ${product.polarized ? '<span class="badge badge-gold">Polarizado</span>' : ''}
          <span class="badge">UV400</span>
          ${stockBadge}
        </div>
        <div class="price-row">
          <span class="price">${formatPrice(product.price)}</span>
          ${product.comparePrice ? `<span class="compare-price">${formatPrice(product.comparePrice)}</span>` : ''}
        </div>
        ${product.stock > 0 ? `<span class="stock-indicator">${Number(product.stock)} disponibles</span>` : ''}
      </div>
    </article>
  `
}

function setupFilters() {
  document.querySelectorAll('[data-category]').forEach((button) => {
    button.addEventListener('click', () => {
      setActive(button, '[data-category]')
      filters.category = button.dataset.category
      fetchProducts()
    })
  })

  document.querySelectorAll('[data-gender]').forEach((button) => {
    button.addEventListener('click', () => {
      setActive(button, '[data-gender]')
      filters.gender = button.dataset.gender
      fetchProducts()
    })
  })

  document.querySelector('#polarized-toggle').addEventListener('change', (event) => {
    filters.polarized = event.target.checked
    fetchProducts()
  })

  document.querySelector('#search-input').addEventListener('input', debounce((event) => {
    filters.search = event.target.value.trim()
    fetchProducts()
  }, 300))

  document.querySelector('#sort-select').addEventListener('change', (event) => {
    filters.sort = event.target.value
    fetchProducts()
  })

  document.querySelector('#products-grid').addEventListener('click', openProduct)
  document.querySelector('#products-grid').addEventListener('keydown', (event) => {
    if (event.key === 'Enter') openProduct(event)
  })
}

function openProduct(event) {
  const card = event.target.closest('.product-card')
  if (card?.dataset.id) window.location = `/product.html?id=${card.dataset.id}`
}

function setActive(activeButton, selector) {
  document.querySelectorAll(selector).forEach((button) => button.classList.remove('active'))
  activeButton.classList.add('active')
}

function debounce(fn, delay) {
  let timer
  return (...args) => {
    clearTimeout(timer)
    timer = setTimeout(() => fn(...args), delay)
  }
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

document.addEventListener('DOMContentLoaded', () => {
  setupFilters()
  fetchProducts()
})
