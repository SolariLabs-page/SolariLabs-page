import { pbkdf2, randomBytes } from 'crypto'
import { promisify } from 'util'
import connectDB from '../_lib/db.js'
import User from '../_lib/User.js'

const pbkdf2Async = promisify(pbkdf2)
const DEFAULT_PASSWORD = 'Solari2025!'
const ITERATIONS = 1000
const KEYLEN     = 64
const DIGEST     = 'sha512'

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

  try {
    await connectDB()

    const { password } = req.body || {}
    if (!password) return res.status(400).json({ error: 'Contraseña requerida' })

    let user = await User.findOne()

    // Primera vez: crear usuario con contraseña default
    if (!user) {
      const salt = randomBytes(16).toString('hex')
      const hash = await hashPwd(DEFAULT_PASSWORD, salt)
      user = await User.create({ passwordHash: hash, passwordSalt: salt })
    }

    // Verificar contraseña
    const attempt = await hashPwd(password, user.passwordSalt)
    if (attempt !== user.passwordHash) {
      return res.status(401).json({ error: 'Contraseña incorrecta' })
    }

    // Generar token (30 días)
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
