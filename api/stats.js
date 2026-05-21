import connectDB from './_lib/db.js'
import Product from './_lib/Product.js'
import Sale from './_lib/Sale.js'
import { requireAuth } from './_lib/auth.js'

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization')
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  const user = await requireAuth(req, res)
  if (!user) return

  try {
    await connectDB()

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const [
      totalProducts,
      stockResult,
      valueResult,
      lowStock,
      salesRevenue,
      salesToday,
      salesUnits,
      totalOrders,
    ] = await Promise.all([
      Product.countDocuments({ active: true }),
      Product.aggregate([
        { $match: { active: true } },
        { $group: { _id: null, total: { $sum: '$stock' } } },
      ]),
      Product.aggregate([
        { $match: { active: true } },
        { $group: { _id: null, total: { $sum: { $multiply: ['$price', '$stock'] } } } },
      ]),
      Product.countDocuments({ active: true, stock: { $gt: 0, $lt: 5 } }),
      Sale.aggregate([
        { $group: { _id: null, total: { $sum: '$total' } } },
      ]),
      Sale.aggregate([
        { $match: { createdAt: { $gte: today } } },
        { $group: { _id: null, total: { $sum: '$total' } } },
      ]),
      Sale.aggregate([
        { $unwind: '$items' },
        { $group: { _id: null, total: { $sum: '$items.quantity' } } },
      ]),
      Sale.countDocuments(),
    ])

    return res.status(200).json({
      products: {
        total:      totalProducts,
        totalStock: stockResult[0]?.total  ?? 0,
        totalValue: valueResult[0]?.total  ?? 0,
        lowStock,
      },
      sales: {
        totalRevenue: salesRevenue[0]?.total ?? 0,
        todayRevenue: salesToday[0]?.total   ?? 0,
        totalUnits:   salesUnits[0]?.total   ?? 0,
        totalOrders,
      },
    })
  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
}
