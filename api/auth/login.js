import { pbkdf2, randomBytes, timingSafeEqual } from 'crypto'
import { promisify } from 'util'
import connectDB from '../_lib/db.js'
import User from '../_lib/User.js'

const pbkdf2Async = promisify(pbkdf2)
const DEFAULT_PASSWORD = 'Solari2025!'
const ITERATIONS = 1000
const KEYLEN     = 64
const DIGEST     = 'sha512'

// Rate limiting en memoria (por instancia serverless)
const attempts = new Map()
function isRateLimited(ip) {
  const now  = Date.now()
  const data = attempts.get(ip)
  if (!data || now - data.first > 15 * 60 * 1000) {
    attempts.set(ip, { count: 1, first: now })
    return false
  }
  if (data.count >= 10) return true
  data.count++
  return false
}

async function hashPwd(password, salt) {
  const buf = await pbkdf2Async(password, salt, ITERATIONS, KEYLEN, DIGEST)
  return buf.toString('hex')
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).end()

  const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || 'unknown'
  if (isRateLimited(ip)) {
    return res.status(429).json({ error: 'Demasiados intentos. Espera 15 minutos.' })
  }

  try {
    await connectDB()

    const { password } = req.body || {}
    if (!password) return res.status(400).json({ error: 'Contraseña requerida' })

    let user = await User.findOne()

    if (!user) {
      const salt = randomBytes(16).toString('hex')
      const hash = await hashPwd(DEFAULT_PASSWORD, salt)
      user = await User.create({ passwordHash: hash, passwordSalt: salt })
    }

    const attempt   = await hashPwd(password, user.passwordSalt)
    const attemptBuf = Buffer.from(attempt, 'hex')
    const storedBuf  = Buffer.from(user.passwordHash, 'hex')

    // Timing-safe comparison — previene timing attacks
    const valid = attemptBuf.length === storedBuf.length &&
                  timingSafeEqual(attemptBuf, storedBuf)

    if (!valid) {
      return res.status(401).json({ error: 'Credenciales incorrectas' })
    }

    const token  = randomBytes(32).toString('hex')
    const expiry = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    user.sessionToken = token
    user.tokenExpiry  = expiry
    await user.save()

    return res.status(200).json({ token })
  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
}
