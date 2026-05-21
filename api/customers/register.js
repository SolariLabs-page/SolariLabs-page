import { pbkdf2, randomBytes } from 'crypto'
import { promisify } from 'util'
import connectDB from '../_lib/db.js'
import Customer from '../_lib/Customer.js'

const pbkdf2Async = promisify(pbkdf2)

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
    await connectDB()

    const { name, email, password } = req.body || {}

    if (!name?.trim() || !email?.trim() || !password) {
      return res.status(400).json({ error: 'Nombre, correo y contraseña son requeridos' })
    }
    if (password.length < 6) {
      return res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres' })
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: 'Correo electrónico inválido' })
    }

    const existing = await Customer.findOne({ email: email.toLowerCase().trim() })
    if (existing) {
      return res.status(400).json({ error: 'Ya existe una cuenta con ese correo' })
    }

    const salt = randomBytes(16).toString('hex')
    const hash = await hashPwd(password, salt)

    const customer = await Customer.create({
      name:         name.trim(),
      email:        email.toLowerCase().trim(),
      passwordHash: hash,
      passwordSalt: salt,
    })

    // Auto-login después del registro
    const token  = randomBytes(32).toString('hex')
    const expiry = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    customer.sessionToken = token
    customer.tokenExpiry  = expiry
    await customer.save()

    return res.status(201).json({
      token,
      customer: { id: customer._id, name: customer.name, email: customer.email },
    })
  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
}
