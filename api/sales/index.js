import connectDB from '../_lib/db.js'
import Product from '../_lib/Product.js'
import Sale from '../_lib/Sale.js'
import { requireAuth } from '../_lib/auth.js'

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization')
  if (req.method === 'OPTIONS') return res.status(200).end()

  const user = await requireAuth(req, res)
  if (!user) return

  try {
    await connectDB()

    if (req.method === 'GET') {
      const limit = Number(req.query.limit) || 100
      const sales = await Sale.find().sort({ createdAt: -1 }).limit(limit)
      return res.status(200).json(sales)
    }

    if (req.method === 'POST') {
      const { items, notes } = req.body

      if (!items?.length) return res.status(400).json({ error: 'Se requiere al menos un producto' })

      // Validate and snapshot products
      const saleItems = []
      for (const item of items) {
        const product = await Product.findById(item.productId)
        if (!product)        return res.status(404).json({ error: `Producto ${item.productId} no encontrado` })
        if (!product.active) return res.status(400).json({ error: `${product.name} no está activo` })
        if (product.stock < item.quantity)
          return res.status(400).json({ error: `Stock insuficiente para ${product.name}. Disponible: ${product.stock}` })

        saleItems.push({
          productId:  product._id,
          name:       product.name,
          sku:        product.sku,
          frameColor: product.frameColor,
          lensColor:  product.lensColor,
          price:      product.price,
          quantity:   item.quantity,
          subtotal:   product.price * item.quantity,
        })
      }

      // Deduct stock
      await Promise.all(
        saleItems.map(item =>
          Product.findByIdAndUpdate(item.productId, { $inc: { stock: -item.quantity } })
        )
      )

      const total = saleItems.reduce((sum, item) => sum + item.subtotal, 0)
      const sale = await Sale.create({ items: saleItems, total, notes })

      return res.status(201).json(sale)
    }

    return res.status(405).json({ error: 'Method not allowed' })
  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
}
