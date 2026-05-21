import connectDB from './db.js'
import Customer from './Customer.js'

export async function requireCustomerAuth(req, res) {
  const header = req.headers.authorization || ''
  const token  = header.replace('Bearer ', '').trim()

  if (!token) {
    res.status(401).json({ error: 'Debes iniciar sesión para continuar' })
    return null
  }

  await connectDB()
  const customer = await Customer.findOne({
    sessionToken: token,
    tokenExpiry:  { $gt: new Date() },
    active:       true,
  })

  if (!customer) {
    res.status(401).json({ error: 'Sesión expirada' })
    return null
  }

  return customer
}
