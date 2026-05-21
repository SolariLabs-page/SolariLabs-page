import connectDB from '../_lib/db.js'
import Customer from '../_lib/Customer.js'
import Order from '../_lib/Order.js'
import { requireAuth } from '../_lib/auth.js'

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization')
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'GET') return res.status(405).end()

  const admin = await requireAuth(req, res)
  if (!admin) return

  try {
    await connectDB()

    const customers = await Customer.find({ active: true })
      .sort({ createdAt: -1 })
      .select('-passwordHash -passwordSalt -sessionToken -tokenExpiry')

    const orderStats = await Order.aggregate([
      { $group: { _id: '$customer.id', orders: { $sum: 1 }, total: { $sum: '$total' } } },
    ])

    const statsMap = {}
    orderStats.forEach(o => { statsMap[String(o._id)] = { orders: o.orders, total: o.total } })

    const result = customers.map(c => ({
      ...c.toObject(),
      stats: statsMap[String(c._id)] || { orders: 0, total: 0 },
    }))

    return res.status(200).json(result)
  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
}
