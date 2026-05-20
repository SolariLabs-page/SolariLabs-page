let products = []
let editingId = null
let deleteId = null
let editParamHandled = false

const placeholderImage = 'data:image/svg+xml;utf8,' + encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 160">
  <rect width="160" height="160" fill="#181818"/>
  <path d="M38 84c12-14 31-14 43 0m-2 0h2m-2 0h2m0 0c12-14 31-14 43 0" fill="none" stroke="#c9a96e" stroke-width="9" stroke-linecap="round"/>
</svg>`)

async function loadStats() {
  try {
    const response = await fetch('/api/stats')
    if (!response.ok) throw new Error('No se pudieron cargar las métricas')
    const stats = await response.json()

    document.querySelector('#stat-total').textContent = stats.total ?? 0
    document.querySelector('#stat-stock').textContent = stats.totalStock ?? 0
    document.querySelector('#stat-value').textContent = formatPrice(stats.totalValue ?? 0)

    const low = document.querySelector('#stat-low')
    low.textContent = stats.lowStock ?? 0
    low.style.color = Number(stats.lowStock || 0) > 0 ? 'var(--danger)' : 'var(--gold)'
  } catch (error) {
    showToast('error', error.message)
  }
}

async function loadProducts() {
  try {
    const response = await fetch('/api/products?admin=true')
    if (!response.ok) throw new Error('No se pudo cargar el inventario')
    products = await response.json()
    renderTable(products)
    openEditFromUrl()
  } catch (error) {
    showToast('error', error.message)
  }
}

function renderTable(list) {
  const tbody = document.querySelector('#table-body')
  tbody.innerHTML = list.map((product) => {
    const stock = Number(product.stock || 0)
    const stockClass = stock === 0 ? 'badge-danger' : stock < 5 ? 'badge-warning' : ''
    const statusClass = product.active ? 'status-active' : 'status-inactive'

    return `
      <tr>
        <td><img class="thumb" src="${escapeAttr(product.images?.[0] || placeholderImage)}" alt="${escapeAttr(product.name || 'Producto')}"></td>
        <td class="product-name">${escapeHtml(product.name || 'Sin nombre')}</td>
        <td class="sku muted">${escapeHtml(product.sku || '—')}</td>
        <td><span class="category-pill">${escapeHtml(capitalize(product.category || '—'))}</span></td>
        <td class="price">${formatPrice(product.price)}</td>
        <td class="stock ${stockClass}">${stock}</td>
        <td><span class="status-badge ${statusClass}">${product.active ? 'Activo' : 'Inactivo'}</span></td>
        <td class="actions">
          <button class="btn-edit" type="button" data-action="edit" data-id="${escapeAttr(product._id)}">Editar</button>
          <button class="btn-delete" type="button" data-action="delete" data-id="${escapeAttr(product._id)}">Eliminar</button>
        </td>
      </tr>
    `
  }).join('')
}

function openCreateModal() {
  const form = document.querySelector('#product-form')
  form.reset()
  form.elements.active.checked = true
  editingId = null
  clearPreview()
  document.querySelector('#modal-title').textContent = 'Agregar lente'
  showProductModal()
}

function openEditModal(product) {
  const form = document.querySelector('#product-form')
  form.reset()
  editingId = product._id

  form.elements.name.value = product.name || ''
  form.elements.sku.value = product.sku || ''
  form.elements.category.value = product.category || 'clásicos'
  form.elements.gender.value = product.gender || 'unisex'
  form.elements.price.value = product.price ?? ''
  form.elements.comparePrice.value = product.comparePrice ?? ''
  form.elements.stock.value = product.stock ?? 0
  form.elements.frameColor.value = product.frameColor || ''
  form.elements.lensColor.value = product.lensColor || ''
  form.elements.material.value = product.material || ''
  form.elements.uvProtection.value = product.uvProtection || 'UV400'
  form.elements.polarized.checked = Boolean(product.polarized)
  form.elements.active.checked = product.active !== false
  form.elements.featured.checked = Boolean(product.featured)
  form.elements.description.value = product.description || ''

  showPreview(product.images?.[0])
  document.querySelector('#modal-title').textContent = 'Editar lente'
  showProductModal()
}

function openDeleteModal(id, name) {
  deleteId = id
  document.querySelector('#delete-product-name').textContent = name
  document.querySelector('#modal-delete').hidden = false
}

async function handleFormSubmit(event) {
  event.preventDefault()
  const form = event.currentTarget
  const data = new FormData(form)

  normalizeCheckbox(data, form, 'polarized')
  normalizeCheckbox(data, form, 'active')
  normalizeCheckbox(data, form, 'featured')
  if (!form.elements.image.files.length) data.delete('image')

  try {
    const response = await fetch(editingId ? `/api/products/${editingId}` : '/api/products', {
      method: editingId ? 'PUT' : 'POST',
      body: data,
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({}))
      throw new Error(error.error || 'No se pudo guardar el lente')
    }

    closeProductModal()
    await Promise.all([loadProducts(), loadStats()])
    showToast('success', editingId ? 'Lente actualizado' : 'Lente agregado')
  } catch (error) {
    showToast('error', error.message)
  }
}

async function handleDelete(id) {
  try {
    const response = await fetch(`/api/products/${id}`, { method: 'DELETE' })
    if (!response.ok) {
      const error = await response.json().catch(() => ({}))
      throw new Error(error.error || 'No se pudo eliminar')
    }

    closeDeleteModal()
    await Promise.all([loadProducts(), loadStats()])
    showToast('success', 'Lente eliminado')
  } catch (error) {
    showToast('error', error.message)
  }
}

function setupTableSearch() {
  document.querySelector('#search-table').addEventListener('input', (event) => {
    const term = event.target.value.trim().toLowerCase()
    const list = products.filter((product) => {
      return product.name?.toLowerCase().includes(term) || product.sku?.toLowerCase().includes(term)
    })
    renderTable(list)
  })
}

function setupDragAndDrop() {
  const zone = document.querySelector('#drop-zone')
  const input = document.querySelector('#file-input')

  zone.addEventListener('click', () => input.click())
  zone.addEventListener('dragover', (event) => {
    event.preventDefault()
    zone.classList.add('drag-over')
  })
  zone.addEventListener('dragleave', () => zone.classList.remove('drag-over'))
  zone.addEventListener('drop', (event) => {
    event.preventDefault()
    zone.classList.remove('drag-over')
    const file = event.dataTransfer.files?.[0]
    if (!file) return
    input.files = event.dataTransfer.files
    previewFile(file)
  })
  input.addEventListener('change', () => {
    const file = input.files?.[0]
    if (file) previewFile(file)
  })
}

function previewFile(file) {
  const reader = new FileReader()
  reader.onload = () => showPreview(reader.result)
  reader.readAsDataURL(file)
}

function showPreview(src) {
  const preview = document.querySelector('#image-preview')
  const text = document.querySelector('.drop-text')
  if (!src) {
    clearPreview()
    return
  }
  preview.src = src
  preview.hidden = false
  text.hidden = true
}

function clearPreview() {
  document.querySelector('#image-preview').hidden = true
  document.querySelector('#image-preview').src = ''
  document.querySelector('.drop-text').hidden = false
}

function showProductModal() {
  document.querySelector('#modal-product').hidden = false
}

function closeProductModal() {
  document.querySelector('#modal-product').hidden = true
}

function closeDeleteModal() {
  document.querySelector('#modal-delete').hidden = true
  deleteId = null
}

function showToast(type, message) {
  const toast = document.createElement('div')
  toast.className = `toast ${type}`
  toast.textContent = message
  document.querySelector('#toast-container').appendChild(toast)

  setTimeout(() => {
    toast.classList.add('fade-out')
    setTimeout(() => toast.remove(), 220)
  }, 3000)
}

function openEditFromUrl() {
  if (editParamHandled) return
  const id = new URLSearchParams(window.location.search).get('edit')
  if (!id) return
  editParamHandled = true
  const product = products.find((item) => item._id === id)
  if (product) openEditModal(product)
}

function normalizeCheckbox(data, form, name) {
  data.set(name, form.elements[name].checked ? 'true' : 'false')
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
  loadStats()
  loadProducts()
  setupTableSearch()
  setupDragAndDrop()

  document.querySelector('#btn-add').addEventListener('click', openCreateModal)
  document.querySelector('#product-form').addEventListener('submit', handleFormSubmit)
  document.querySelector('#btn-cancel').addEventListener('click', closeProductModal)
  document.querySelector('#modal-overlay').addEventListener('click', closeProductModal)
  document.querySelector('#delete-overlay').addEventListener('click', closeDeleteModal)
  document.querySelector('#btn-delete-cancel').addEventListener('click', closeDeleteModal)
  document.querySelector('#btn-delete-confirm').addEventListener('click', () => {
    if (deleteId) handleDelete(deleteId)
  })

  document.querySelector('#table-body').addEventListener('click', (event) => {
    const button = event.target.closest('button[data-action]')
    if (!button) return
    const product = products.find((item) => item._id === button.dataset.id)
    if (!product) return

    if (button.dataset.action === 'edit') openEditModal(product)
    if (button.dataset.action === 'delete') openDeleteModal(product._id, product.name)
  })
})
