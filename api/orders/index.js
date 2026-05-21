import connectDB from '../_lib/db.js'
import Product from '../_lib/Product.js'
import Order from '../_lib/Order.js'
import { requireAuth } from '../_lib/auth.js'
import { requireCustomerAuth } from '../_lib/customerAuth.js'

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization')
  if (req.method === 'OPTIONS') return res.status(200).end()

  try {
    await connectDB()

    if (req.method === 'GET') {
      const admin = await requireAuth(req, res)
      if (!admin) return
      const { status } = req.query
      const query = status ? { status } : {}
      const orders = await Order.find(query).sort({ createdAt: -1 })
      return res.status(200).json(orders)
    }

    if (req.method === 'POST') {
      const customer = await requireCustomerAuth(req, res)
      if (!customer) return

      const { items, shipping, notes } = req.body || {}

      if (!items?.length) {
        return res.status(400).json({ error: 'El carrito está vacío' })
      }
      if (!shipping?.method) {
        return res.status(400).json({ error: 'Selecciona un método de envío' })
      }

      const orderItems = []
      for (const item of items) {
        const product = await Product.findById(item.productId)
        if (!product || !product.active) {
          return res.status(404).json({ error: `Producto no disponible` })
        }
        if (product.stock < item.quantity) {
          return res.status(400).json({ error: `Stock insuficiente para ${product.name}` })
        }
        orderItems.push({
          productId:  product._id,
          name:       product.name,
          frameColor: product.frameColor,
          lensColor:  product.lensColor,
          price:      product.price,
          quantity:   item.quantity,
          subtotal:   product.price * item.quantity,
          image:      product.images?.[0] || '',
        })
      }

      await Promise.all(orderItems.map(i =>
        Product.findByIdAndUpdate(i.productId, { $inc: { stock: -i.quantity } })
      ))

      const total = orderItems.reduce((s, i) => s + i.subtotal, 0)
      const order = await Order.create({
        customer: { id: customer._id, name: customer.name, email: customer.email },
        items: orderItems,
        shipping,
        notes,
        total,
      })

      return res.status(201).json(order)
    }

    return res.status(405).json({ error: 'Method not allowed' })
  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
}
