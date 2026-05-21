import { pbkdf2, randomBytes, timingSafeEqual } from 'crypto'
import { promisify } from 'util'
import connectDB from '../_lib/db.js'
import Customer from '../_lib/Customer.js'

const pbkdf2Async = promisify(pbkdf2)

const attempts = new Map()
function isRateLimited(email) {
  const now  = Date.now()
  const data = attempts.get(email)
  if (!data || now - data.first > 15 * 60 * 1000) {
    attempts.set(email, { count: 1, first: now })
    return false
  }
  if (data.count >= 10) return true
  data.count++
  return false
}

async function hashPwd(password, salt) {
  const buf = await pbkdf2Async(password, salt, 1000, 64, 'sha512')
  return buf.toString('hex')
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).end()

  try {
    const { email, password } = req.body || {}
    if (!email || !password) {
      return res.status(400).json({ error: 'Correo y contraseña requeridos' })
    }

    const key = email.toLowerCase().trim()
    if (isRateLimited(key)) {
      return res.status(429).json({ error: 'Demasiados intentos. Espera 15 minutos.' })
    }

    await connectDB()
    const customer = await Customer.findOne({ email: key, active: true })
    if (!customer) {
      return res.status(401).json({ error: 'Credenciales incorrectas' })
    }

    const attempt    = await hashPwd(password, customer.passwordSalt)
    const attemptBuf = Buffer.from(attempt, 'hex')
    const storedBuf  = Buffer.from(customer.passwordHash, 'hex')
    const valid      = attemptBuf.length === storedBuf.length &&
                       timingSafeEqual(attemptBuf, storedBuf)

    if (!valid) {
      return res.status(401).json({ error: 'Credenciales incorrectas' })
    }

    const token  = randomBytes(32).toString('hex')
    const expiry = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    customer.sessionToken = token
    customer.tokenExpiry  = expiry
    await customer.save()

    return res.status(200).json({
      token,
      customer: { id: customer._id, name: customer.name, email: customer.email },
    })
  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
}
