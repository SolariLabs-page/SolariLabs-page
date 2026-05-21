const placeholder = 'data:image/svg+xml;utf8,' + encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 120"><rect width="160" height="120" fill="#181310"/><path d="M38 68c12-14 31-14 43 0m-2 0h2m0 0c12-14 31-14 43 0" fill="none" stroke="#d4892a" stroke-width="9" stroke-linecap="round"/></svg>'
)

let products = []
let editingId = null
let deleteId  = null

// ── Stats ─────────────────────────────────────────────────────
async function loadStats() {
  try {
    const res = await fetch('/api/stats')
    if (!res.ok) return
    const data = await res.json()
    const p = data.products || {}
    document.querySelector('#stat-products').textContent = p.total      ?? 0
    document.querySelector('#stat-stock').textContent    = p.totalStock ?? 0
    document.querySelector('#stat-value').textContent    = price(p.totalValue)
  } catch { /* silent */ }
}

// ── Products ──────────────────────────────────────────────────
async function loadProducts() {
  try {
    const res = await fetch('/api/products?admin=true')
    if (!res.ok) throw new Error()
    products = await res.json()
    document.querySelector('#inv-loading').hidden = true
    render(products)
  } catch {
    document.querySelector('#inv-loading').hidden = true
    showToast('error', 'No se pudo cargar el inventario')
  }
}

function render(list) {
  const tbody = document.querySelector('#inv-body')
  const empty = document.querySelector('#inv-empty')

  if (!list.length) { empty.hidden = false; tbody.innerHTML = ''; return }
  empty.hidden = true

  tbody.innerHTML = list.map(p => {
    const img   = p.images?.[0] || placeholder
    const stock = Number(p.stock || 0)
    const stockColor = stock === 0 ? 'var(--danger)' : stock < 5 ? 'var(--yellow)' : 'inherit'

    return `
      <tr>
        <td><img class="product-thumb" src="${esc(img)}" alt="${esc(p.name)}"></td>
        <td>
          <div style="font-weight:500">${esc(p.name)}</div>
          ${p.sku ? `<div class="td-muted">${esc(p.sku)}</div>` : ''}
        </td>
        <td><span class="frame-badge"><span class="lens-dot dot-${esc(p.frameColor || '')}"></span>${cap(p.frameColor)}</span></td>
        <td><span class="lens-badge ${esc(p.lensColor || '')}">${cap(p.lensColor)}</span></td>
        <td>
          ${price(p.price)}
          ${p.comparePrice ? `<div class="td-muted" style="text-decoration:line-through;font-size:.82rem">${price(p.comparePrice)}</div>` : ''}
        </td>
        <td>
          <div class="stock-ctrl">
            <button class="stock-adj" data-action="dec" data-id="${esc(p._id)}" ${stock <= 0 ? 'disabled' : ''}>−</button>
            <span class="stock-num" style="color:${stockColor}">${stock}</span>
            <button class="stock-adj" data-action="inc" data-id="${esc(p._id)}">+</button>
          </div>
        </td>
        <td><span class="status-dot ${p.active ? 'status-active' : 'status-inactive'}">${p.active ? 'Activo' : 'Inactivo'}</span></td>
        <td>
          <div class="row-actions">
            <button class="btn btn-ghost btn-sm"         data-action="edit"   data-id="${esc(p._id)}">Editar</button>
            <button class="btn btn-danger-outline btn-sm" data-action="delete" data-id="${esc(p._id)}">Eliminar</button>
          </div>
        </td>
      </tr>
    `
  }).join('')
}

// ── Stock quick adjust ────────────────────────────────────────
async function adjustStock(id, delta) {
  const p = products.find(x => x._id === id)
  if (!p) return
  const newStock = Math.max(0, Number(p.stock || 0) + delta)

  try {
    const res = await fetch(`/api/products/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ stock: newStock, active: p.active }),
    })
    if (!res.ok) throw new Error()
    p.stock = newStock
    render(products)
    loadStats()
  } catch {
    showToast('error', 'No se pudo actualizar el stock')
  }
}

// ── Add / Edit modal ──────────────────────────────────────────
let pendingBase64 = null   // imagen seleccionada pero no guardada aún

function openCreate() {
  editingId = null
  pendingBase64 = null
  document.querySelector('#modal-title').textContent = 'Agregar producto'
  document.querySelector('#product-form').reset()
  clearImagePreview()
  document.querySelector('#modal-product').hidden = false
}

function openEdit(id) {
  const p = products.find(x => x._id === id)
  if (!p) return
  editingId = id

  document.querySelector('#modal-title').textContent = 'Editar producto'
  const f = document.querySelector('#product-form')
  f.reset()
  f.elements.name.value         = p.name   || ''
  f.elements.sku.value          = p.sku    || ''
  f.elements.price.value        = p.price  ?? ''
  f.elements.stock.value        = p.stock  ?? 0
  f.elements.description.value = p.description || ''
  f.elements.active.checked    = p.active !== false

  const fc = f.querySelector(`input[name="frameColor"][value="${p.frameColor}"]`)
  const lc = f.querySelector(`input[name="lensColor"][value="${p.lensColor}"]`)
  if (fc) fc.checked = true
  if (lc) lc.checked = true

  pendingBase64 = null
  const existingImg = p.images?.[0] || ''
  showImagePreview(existingImg)
  document.querySelector('#image-url-input').value = existingImg

  document.querySelector('#modal-product').hidden = false
}

function closeProduct() { document.querySelector('#modal-product').hidden = true }

async function handleFormSubmit(e) {
  e.preventDefault()
  const f = e.currentTarget

  const body = {
    name:        f.elements.name.value.trim(),
    sku:         f.elements.sku.value.trim() || undefined,
    price:       Number(f.elements.price.value),
    frameColor:  f.querySelector('input[name="frameColor"]:checked')?.value,
    lensColor:   f.querySelector('input[name="lensColor"]:checked')?.value,
    stock:       Number(f.elements.stock.value) || 0,
    description: f.elements.description.value.trim(),
    active:      f.elements.active.checked,
  }

  // Imagen: base64 tiene prioridad sobre URL manual
  if (pendingBase64) {
    body.imageBase64 = pendingBase64
  } else {
    const urlVal = document.querySelector('#image-url-input').value.trim()
    if (urlVal) body.imageUrl = urlVal
  }

  const btn = document.querySelector('#btn-save')
  btn.disabled = true
  btn.textContent = 'Guardando…'

  try {
    const res = await fetch(
      editingId ? `/api/products/${editingId}` : '/api/products',
      { method: editingId ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }
    )
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.error || 'Error al guardar')
    }

    closeProduct()
    await Promise.all([loadProducts(), loadStats()])
    showToast('success', editingId ? 'Producto actualizado' : 'Producto creado')
  } catch (err) {
    showToast('error', err.message)
  } finally {
    btn.disabled = false
    btn.textContent = 'Guardar'
  }
}

// ── Delete modal ──────────────────────────────────────────────
function openDelete(id) {
  const p = products.find(x => x._id === id)
  if (!p) return
  deleteId = id
  document.querySelector('#delete-name').textContent = p.name
  document.querySelector('#modal-delete').hidden = false
}

function closeDelete() { document.querySelector('#modal-delete').hidden = true; deleteId = null }

async function handleDelete() {
  if (!deleteId) return
  const btn = document.querySelector('#delete-confirm')
  btn.disabled = true

  try {
    const res = await fetch(`/api/products/${deleteId}`, { method: 'DELETE' })
    if (!res.ok) throw new Error()
    closeDelete()
    await Promise.all([loadProducts(), loadStats()])
    showToast('success', 'Producto eliminado')
  } catch {
    showToast('error', 'No se pudo eliminar')
  } finally {
    btn.disabled = false
  }
}

// ── Image preview & drag-drop ─────────────────────────────────
function showImagePreview(src) {
  const preview  = document.querySelector('#img-preview')
  const dropText = document.querySelector('.drop-text')
  if (src) {
    preview.src    = src
    preview.hidden = false
    if (dropText) dropText.hidden = true
  } else {
    preview.src    = ''
    preview.hidden = true
    if (dropText) dropText.hidden = false
  }
}

function clearImagePreview() {
  pendingBase64 = null
  showImagePreview(null)
  const urlInput = document.querySelector('#image-url-input')
  if (urlInput) urlInput.value = ''
}

function readFileAsBase64(file) {
  return new Promise((resolve, reject) => {
    if (file.size > 4 * 1024 * 1024) {
      reject(new Error('La imagen no puede superar 4MB'))
      return
    }
    const reader = new FileReader()
    reader.onload  = () => resolve(reader.result)
    reader.onerror = () => reject(new Error('Error leyendo el archivo'))
    reader.readAsDataURL(file)
  })
}

function setupDrop() {
  const zone  = document.querySelector('#drop-zone')
  const input = document.querySelector('#file-input')
  if (!zone || !input) return

  zone.addEventListener('click', () => input.click())

  zone.addEventListener('dragover', e => {
    e.preventDefault()
    zone.classList.add('drag-over')
  })
  zone.addEventListener('dragleave', () => zone.classList.remove('drag-over'))

  zone.addEventListener('drop', async e => {
    e.preventDefault()
    zone.classList.remove('drag-over')
    const file = e.dataTransfer.files?.[0]
    if (file) await processFile(file)
  })

  input.addEventListener('change', async () => {
    const file = input.files?.[0]
    if (file) await processFile(file)
  })

  async function processFile(file) {
    try {
      const base64 = await readFileAsBase64(file)
      pendingBase64 = base64
      showImagePreview(base64)
      document.querySelector('#image-url-input').value = ''
    } catch (err) {
      showToast('error', err.message)
    }
  }
}

// ── Search ────────────────────────────────────────────────────
function setupSearch() {
  document.querySelector('#search').addEventListener('input', e => {
    const q = e.target.value.toLowerCase().trim()
    render(products.filter(p => p.name.toLowerCase().includes(q) || (p.sku || '').toLowerCase().includes(q)))
  })
}

// ── Table delegation ──────────────────────────────────────────
function setupTable() {
  document.querySelector('#inv-body').addEventListener('click', e => {
    const btn = e.target.closest('button[data-action]')
    if (!btn) return
    const { action, id } = btn.dataset
    if (action === 'edit')   openEdit(id)
    if (action === 'delete') openDelete(id)
    if (action === 'inc')    adjustStock(id, +1)
    if (action === 'dec')    adjustStock(id, -1)
  })
}

// ── Utils ─────────────────────────────────────────────────────
function price(n) { return '₡' + Number(n || 0).toLocaleString('es-CR') }
function cap(s)   { return s ? s.charAt(0).toUpperCase() + s.slice(1) : '' }
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
  loadStats()
  loadProducts()
  setupSearch()
  setupTable()
  setupDrop()

  document.querySelector('#btn-add').addEventListener('click', openCreate)
  document.querySelector('#product-form').addEventListener('submit', handleFormSubmit)
  document.querySelector('#btn-cancel').addEventListener('click', closeProduct)
  document.querySelector('#product-overlay').addEventListener('click', closeProduct)

  document.querySelector('#delete-cancel').addEventListener('click', closeDelete)
  document.querySelector('#delete-overlay').addEventListener('click', closeDelete)
  document.querySelector('#delete-confirm').addEventListener('click', handleDelete)
})
