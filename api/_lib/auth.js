import connectDB from './db.js'
import User from './User.js'

export async function requireAuth(req, res) {
  const header = req.headers.authorization || ''
  const token  = header.replace('Bearer ', '').trim()

  if (!token) {
    res.status(401).json({ error: 'No autorizado' })
    return null
  }

  await connectDB()
  const user = await User.findOne({
    sessionToken: token,
    tokenExpiry:  { $gt: new Date() },
  })

  if (!user) {
    res.status(401).json({ error: 'Sesión expirada' })
    return null
  }

  return user
}
