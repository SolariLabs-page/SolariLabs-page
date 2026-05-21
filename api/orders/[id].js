import connectDB from '../_lib/db.js'
import Order from '../_lib/Order.js'
import { requireAuth } from '../_lib/auth.js'

const VALID = ['pendiente', 'confirmado', 'en-proceso', 'enviado', 'entregado', 'cancelado']

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET,PUT,OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization')
  if (req.method === 'OPTIONS') return res.status(200).end()

  const admin = await requireAuth(req, res)
  if (!admin) return

  try {
    await connectDB()
    const { id } = req.query

    if (req.method === 'GET') {
      const order = await Order.findById(id)
      if (!order) return res.status(404).json({ error: 'Pedido no encontrado' })
      return res.status(200).json(order)
    }

    if (req.method === 'PUT') {
      const { status } = req.body || {}
      if (!VALID.includes(status)) {
        return res.status(400).json({ error: 'Estado inválido' })
      }
      const order = await Order.findByIdAndUpdate(id, { status }, { new: true })
      if (!order) return res.status(404).json({ error: 'Pedido no encontrado' })
      return res.status(200).json(order)
    }

    return res.status(405).json({ error: 'Method not allowed' })
  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
}
