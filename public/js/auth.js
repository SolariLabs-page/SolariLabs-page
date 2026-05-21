// ── Verificación inmediata de sesión ─────────────────────────
;(function () {
  const token = localStorage.getItem('sl_token')
  if (!token) window.location.replace('login.html')
})()

// ── Fetch interceptor: agrega Authorization a todas las llamadas /api/ ──
;(function () {
  const _fetch = window.fetch.bind(window)

  window.fetch = function (input, opts = {}) {
    const url = typeof input === 'string' ? input : (input?.url || '')

    if (url.includes('/api/')) {
      const token = localStorage.getItem('sl_token')
      if (token) {
        opts = {
          ...opts,
          headers: {
            'Content-Type': 'application/json',
            ...opts.headers,
            'Authorization': 'Bearer ' + token,
          },
        }
      }
    }

    return _fetch(input, opts).then(res => {
      if (res.status === 401) {
        localStorage.removeItem('sl_token')
        window.location.replace('login.html')
      }
      return res
    })
  }
})()

// ── UI: menú de usuario + modal de contraseña ────────────────
document.addEventListener('DOMContentLoaded', () => {
  // Inyectar menú de usuario en el header
  const headerInner = document.querySelector('.header-inner')
  if (headerInner) {
    const menu = document.createElement('div')
    menu.className = 'user-menu'
    menu.style.cssText = 'display:flex;align-items:center;gap:8px;margin-left:auto'
    menu.innerHTML = `
      <button class="btn btn-ghost btn-sm" id="btn-change-pwd" type="button">⚙ Contraseña</button>
      <button class="btn btn-danger-outline btn-sm" id="btn-logout" type="button">Salir</button>
    `
    headerInner.appendChild(menu)
  }

  // Inyectar modal cambio de contraseña
  const modalHtml = `
    <div id="modal-changepwd" class="modal" hidden>
      <div class="modal-overlay" id="changepwd-overlay"></div>
      <div class="modal-box" style="max-width:380px">
        <h2>Cambiar contraseña</h2>
        <form id="changepwd-form" class="form-grid" style="margin-top:20px">
          <div class="field">
            <label>Contraseña actual</label>
            <input type="password" name="currentPassword" required>
          </div>
          <div class="field">
            <label>Nueva contraseña</label>
            <input type="password" name="newPassword" required minlength="6">
          </div>
          <div class="field">
            <label>Confirmar nueva contraseña</label>
            <input type="password" name="confirmPassword" required minlength="6">
          </div>
          <div id="changepwd-error" hidden style="color:var(--danger);font-size:.85rem;padding:8px;background:rgba(192,48,48,.08);border-radius:var(--radius);border:1px solid rgba(192,48,48,.25)"></div>
          <div class="modal-actions">
            <button type="button" class="btn btn-ghost" id="changepwd-cancel">Cancelar</button>
            <button type="submit" class="btn btn-amber" id="changepwd-submit">Guardar</button>
          </div>
        </form>
      </div>
    </div>
  `
  document.body.insertAdjacentHTML('beforeend', modalHtml)

  // ── Handlers ──────────────────────────────────────────────
  function openChangePwd() {
    document.querySelector('#changepwd-form').reset()
    document.querySelector('#changepwd-error').hidden = true
    document.querySelector('#modal-changepwd').hidden = false
  }

  function closeChangePwd() {
    document.querySelector('#modal-changepwd').hidden = true
  }

  async function handleLogout() {
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
    } catch { /* ignorar errores de red */ }
    localStorage.removeItem('sl_token')
    window.location.replace('login.html')
  }

  async function handleChangePwd(e) {
    e.preventDefault()
    const f       = e.currentTarget
    const errorEl = document.querySelector('#changepwd-error')
    const btn     = document.querySelector('#changepwd-submit')

    const currentPassword = f.elements.currentPassword.value
    const newPassword     = f.elements.newPassword.value
    const confirmPassword = f.elements.confirmPassword.value

    errorEl.hidden = true

    if (newPassword !== confirmPassword) {
      errorEl.textContent = 'Las contraseñas nuevas no coinciden'
      errorEl.hidden = false
      return
    }

    btn.disabled = true
    btn.textContent = 'Guardando…'

    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'PUT',
        body: JSON.stringify({ currentPassword, newPassword }),
      })
      const data = await res.json()

      if (!res.ok) throw new Error(data.error || 'Error al cambiar contraseña')

      closeChangePwd()
      showAuthToast('success', 'Contraseña actualizada correctamente')
    } catch (err) {
      errorEl.textContent = err.message
      errorEl.hidden = false
    } finally {
      btn.disabled = false
      btn.textContent = 'Guardar'
    }
  }

  // Eventos
  document.querySelector('#btn-logout')?.addEventListener('click', handleLogout)
  document.querySelector('#btn-change-pwd')?.addEventListener('click', openChangePwd)
  document.querySelector('#changepwd-cancel')?.addEventListener('click', closeChangePwd)
  document.querySelector('#changepwd-overlay')?.addEventListener('click', closeChangePwd)
  document.querySelector('#changepwd-form')?.addEventListener('submit', handleChangePwd)
})

// ── Toast helper (funciona aunque toast-container no exista aún) ──
function showAuthToast(type, msg) {
  const container = document.querySelector('#toast-container')
  if (!container) return
  const t = document.createElement('div')
  t.className = `toast ${type}`
  t.textContent = msg
  container.appendChild(t)
  setTimeout(() => { t.classList.add('fade-out'); setTimeout(() => t.remove(), 220) }, 3500)
}
