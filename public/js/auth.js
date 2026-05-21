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

// ── Eye toggle helper ─────────────────────────────────────────
const EYE_OPEN   = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>`
const EYE_CLOSED = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>`

function addEyeToggle(input) {
  const wrapper = document.createElement('div')
  wrapper.className = 'pwd-field'
  input.parentNode.insertBefore(wrapper, input)
  wrapper.appendChild(input)

  const btn = document.createElement('button')
  btn.type = 'button'
  btn.className = 'pwd-toggle'
  btn.setAttribute('aria-label', 'Mostrar contraseña')
  btn.innerHTML = EYE_OPEN
  wrapper.appendChild(btn)

  btn.addEventListener('click', () => {
    const show = input.type === 'password'
    input.type = show ? 'text' : 'password'
    btn.innerHTML = show ? EYE_CLOSED : EYE_OPEN
    btn.setAttribute('aria-label', show ? 'Ocultar contraseña' : 'Mostrar contraseña')
  })
}

// ── UI: hamburger + menú de usuario + modal de contraseña ────
document.addEventListener('DOMContentLoaded', () => {
  const headerInner = document.querySelector('.header-inner')
  const siteNav     = document.querySelector('.site-nav')

  // ── Menú de usuario (desktop) ────────────────────────────
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

  // ── Hamburger + opciones de usuario en el nav móvil ──────
  if (headerInner && siteNav) {
    // Inyectar botones de usuario al final del nav (visibles solo en móvil vía CSS)
    const userSection = document.createElement('div')
    userSection.className = 'nav-user-section'
    userSection.innerHTML = `
      <button class="nav-user-btn" id="nav-change-pwd" type="button">⚙ Cambiar contraseña</button>
      <button class="nav-user-btn danger" id="nav-logout" type="button">Salir</button>
    `
    siteNav.appendChild(userSection)

    // Inyectar botón hamburger
    const hamburger = document.createElement('button')
    hamburger.className = 'hamburger'
    hamburger.id = 'hamburger-btn'
    hamburger.setAttribute('aria-label', 'Menú')
    hamburger.setAttribute('aria-expanded', 'false')
    hamburger.innerHTML = '<span></span><span></span><span></span>'
    headerInner.insertBefore(hamburger, headerInner.querySelector('.user-menu'))

    // Toggle
    function openNav() {
      siteNav.classList.add('open')
      hamburger.classList.add('open')
      hamburger.setAttribute('aria-expanded', 'true')
    }

    function closeNav() {
      siteNav.classList.remove('open')
      hamburger.classList.remove('open')
      hamburger.setAttribute('aria-expanded', 'false')
    }

    hamburger.addEventListener('click', () => {
      siteNav.classList.contains('open') ? closeNav() : openNav()
    })

    // Cerrar al hacer click en un link de nav
    siteNav.querySelectorAll('.nav-link').forEach(link =>
      link.addEventListener('click', closeNav)
    )

    // Cerrar al hacer click fuera
    document.addEventListener('click', e => {
      if (!headerInner.contains(e.target)) closeNav()
    })

    // Botones de usuario en el drawer móvil
    document.querySelector('#nav-change-pwd')?.addEventListener('click', () => {
      closeNav()
      openChangePwd()
    })
    document.querySelector('#nav-logout')?.addEventListener('click', () => {
      closeNav()
      handleLogout()
    })
  }

  // ── Modal cambio de contraseña ────────────────────────────
  document.body.insertAdjacentHTML('beforeend', `
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
  `)

  // Agregar eye toggle a los 3 campos del modal
  document.querySelectorAll('#changepwd-form input[type="password"]').forEach(addEyeToggle)

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
    try { await fetch('/api/auth/logout', { method: 'POST' }) } catch { /* red */ }
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
      const res  = await fetch('/api/auth/change-password', {
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

  // Eventos desktop
  document.querySelector('#btn-logout')?.addEventListener('click', handleLogout)
  document.querySelector('#btn-change-pwd')?.addEventListener('click', openChangePwd)
  document.querySelector('#changepwd-cancel')?.addEventListener('click', closeChangePwd)
  document.querySelector('#changepwd-overlay')?.addEventListener('click', closeChangePwd)
  document.querySelector('#changepwd-form')?.addEventListener('submit', handleChangePwd)
})

// ── Toast helper ──────────────────────────────────────────────
function showAuthToast(type, msg) {
  const container = document.querySelector('#toast-container')
  if (!container) return
  const t = document.createElement('div')
  t.className = `toast ${type}`
  t.textContent = msg
  container.appendChild(t)
  setTimeout(() => { t.classList.add('fade-out'); setTimeout(() => t.remove(), 220) }, 3500)
}
