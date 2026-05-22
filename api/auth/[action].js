import { pbkdf2, randomBytes, timingSafeEqual } from 'crypto'
import { promisify } from 'util'
import connectDB from '../_lib/db.js'
import User from '../_lib/User.js'
import { requireAuth } from '../_lib/auth.js'

const pbkdf2Async   = promisify(pbkdf2)
const DEFAULT_PWD   = 'Solari2025!'
const ITERATIONS    = 1000
const KEYLEN        = 64
const DIGEST        = 'sha512'

const attempts = new Map()
function isRateLimited(ip) {
  const now = Date.now()
  const d   = attempts.get(ip)
  if (!d || now - d.first > 15 * 60 * 1000) { attempts.set(ip, { count: 1, first: now }); return false }
  if (d.count >= 10) return true
  d.count++; return false
}

async function hashPwd(password, salt) {
  return (await pbkdf2Async(password, salt, ITERATIONS, KEYLEN, DIGEST)).toString('hex')
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST,PUT,OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization')
  if (req.method === 'OPTIONS') return res.status(200).end()

  const action = req.query.action

  // ── POST /api/auth/login ──────────────────────────────────
  if (action === 'login' && req.method === 'POST') {
    const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || 'unknown'
    if (isRateLimited(ip)) return res.status(429).json({ error: 'Demasiados intentos. Espera 15 minutos.' })

    try {
      await connectDB()
      const { password } = req.body || {}
      if (!password) return res.status(400).json({ error: 'Contraseña requerida' })

      let user = await User.findOne()
      if (!user) {
        const salt = randomBytes(16).toString('hex')
        user = await User.create({ passwordHash: await hashPwd(DEFAULT_PWD, salt), passwordSalt: salt })
      }

      const attempt    = await hashPwd(password, user.passwordSalt)
      const attemptBuf = Buffer.from(attempt, 'hex')
      const storedBuf  = Buffer.from(user.passwordHash, 'hex')
      const valid      = attemptBuf.length === storedBuf.length && timingSafeEqual(attemptBuf, storedBuf)
      if (!valid) return res.status(401).json({ error: 'Credenciales incorrectas' })

      const token  = randomBytes(32).toString('hex')
      user.sessionToken = token
      user.tokenExpiry  = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      await user.save()
      return res.status(200).json({ token })
    } catch (err) { return res.status(500).json({ error: err.message }) }
  }

  // ── POST /api/auth/logout ─────────────────────────────────
  if (action === 'logout' && req.method === 'POST') {
    const user = await requireAuth(req, res)
    if (!user) return
    user.sessionToken = undefined
    user.tokenExpiry  = undefined
    await user.save()
    return res.status(200).json({ success: true })
  }

  // ── PUT /api/auth/change-password ─────────────────────────
  if (action === 'change-password' && req.method === 'PUT') {
    const user = await requireAuth(req, res)
    if (!user) return
    try {
      const { currentPassword, newPassword } = req.body || {}
      if (!currentPassword || !newPassword) return res.status(400).json({ error: 'Faltan campos requeridos' })
      if (newPassword.length < 6) return res.status(400).json({ error: 'La nueva contraseña debe tener al menos 6 caracteres' })

      const attempt    = await hashPwd(currentPassword, user.passwordSalt)
      const attemptBuf = Buffer.from(attempt, 'hex')
      const storedBuf  = Buffer.from(user.passwordHash, 'hex')
      const valid      = attemptBuf.length === storedBuf.length && timingSafeEqual(attemptBuf, storedBuf)
      if (!valid) return res.status(401).json({ error: 'Contraseña actual incorrecta' })

      const newSalt     = randomBytes(16).toString('hex')
      user.passwordHash = await hashPwd(newPassword, newSalt)
      user.passwordSalt = newSalt
      await user.save()
      return res.status(200).json({ success: true })
    } catch (err) { return res.status(500).json({ error: err.message }) }
  }

  return res.status(404).json({ error: 'Acción no encontrada' })
}
