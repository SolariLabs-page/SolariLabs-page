import connectDB from '../_lib/db.js'
import Sale from '../_lib/Sale.js'
import Product from '../_lib/Product.js'
import { requireAuth } from '../_lib/auth.js'

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET,PUT,DELETE,OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization')
  if (req.method === 'OPTIONS') return res.status(200).end()

  const user = await requireAuth(req, res)
  if (!user) return

  try {
    await connectDB()
    const { id } = req.query

    if (req.method === 'GET') {
      const sale = await Sale.findById(id)
      if (!sale) return res.status(404).json({ error: 'Venta no encontrada' })
      return res.status(200).json(sale)
    }

    if (req.method === 'PUT') {
      const { items, createdAt, notes, total, applyToInventory } = req.body || {}

      const sale = await Sale.findById(id)
      if (!sale) return res.status(404).json({ error: 'Venta no encontrada' })

      if (applyToInventory) {
        // 1. Restaurar stock de los items originales
        await Promise.all(sale.items.map(item =>
          Product.findByIdAndUpdate(item.productId, { $inc: { stock: item.quantity } })
            .catch(() => {})
        ))
        // 2. Descontar stock de los nuevos items
        if (items?.length) {
          await Promise.all(items.map(item =>
            Product.findByIdAndUpdate(item.productId, { $inc: { stock: -item.quantity } })
              .catch(() => {})
          ))
        }
      }

      const updates = {}
      if (items?.length)       updates.items     = items
      if (createdAt)           updates.createdAt = new Date(createdAt)
      if (notes  !== undefined) updates.notes    = notes
      if (total  !== undefined) updates.total    = Number(total)

      const updated = await Sale.findByIdAndUpdate(id, updates, { new: true })
      return res.status(200).json(updated)
    }

    if (req.method === 'DELETE') {
      const { restoreStock } = req.body || {}

      const sale = await Sale.findById(id)
      if (!sale) return res.status(404).json({ error: 'Venta no encontrada' })

      if (restoreStock) {
        await Promise.all(sale.items.map(item =>
          Product.findByIdAndUpdate(item.productId, { $inc: { stock: item.quantity } })
            .catch(() => {})
        ))
      }

      await Sale.findByIdAndDelete(id)
      return res.status(200).json({ success: true })
    }

    return res.status(405).json({ error: 'Method not allowed' })
  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
}
