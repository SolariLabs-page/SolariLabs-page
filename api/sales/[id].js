import connectDB from '../_lib/db.js'
import Sale from '../_lib/Sale.js'
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
      const { notes, total } = req.body || {}
      const updates = {}

      // Solo se permite editar notas y total — el stock NO se toca
      if (notes !== undefined) updates.notes = notes
      if (total !== undefined) updates.total = Number(total)

      const sale = await Sale.findByIdAndUpdate(id, updates, { new: true })
      if (!sale) return res.status(404).json({ error: 'Venta no encontrada' })
      return res.status(200).json(sale)
    }

    if (req.method === 'DELETE') {
      // Elimina solo el registro histórico — el stock NO se restaura
      const sale = await Sale.findByIdAndDelete(id)
      if (!sale) return res.status(404).json({ error: 'Venta no encontrada' })
      return res.status(200).json({ success: true })
    }

    return res.status(405).json({ error: 'Method not allowed' })
  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
}
