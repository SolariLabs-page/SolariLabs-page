import { pbkdf2, randomBytes } from 'crypto'
import { promisify } from 'util'
import { requireAuth } from '../_lib/auth.js'

const pbkdf2Async = promisify(pbkdf2)
const ITERATIONS  = 1000
const KEYLEN      = 64
const DIGEST      = 'sha512'

async function hashPwd(password, salt) {
  const buf = await pbkdf2Async(password, salt, ITERATIONS, KEYLEN, DIGEST)
  return buf.toString('hex')
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'PUT,OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization')
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'PUT') return res.status(405).end()

  const user = await requireAuth(req, res)
  if (!user) return

  try {
    const { currentPassword, newPassword } = req.body || {}

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Faltan campos requeridos' })
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'La nueva contraseña debe tener al menos 6 caracteres' })
    }

    const attempt = await hashPwd(currentPassword, user.passwordSalt)
    if (attempt !== user.passwordHash) {
      return res.status(401).json({ error: 'Contraseña actual incorrecta' })
    }

    const newSalt         = randomBytes(16).toString('hex')
    user.passwordHash     = await hashPwd(newPassword, newSalt)
    user.passwordSalt     = newSalt
    await user.save()

    return res.status(200).json({ success: true })
  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
}
