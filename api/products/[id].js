import connectDB from '../_lib/db.js'
import Product from '../_lib/Product.js'

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET,PUT,DELETE,OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.status(200).end()

  try {
    await connectDB()
    const { id } = req.query

    if (req.method === 'GET') {
      const product = await Product.findById(id)
      if (!product) return res.status(404).json({ error: 'Product not found' })
      return res.status(200).json(product)
    }

    if (req.method === 'PUT') {
      const body = req.body || {}
      const updates = {}

      if (body.name         !== undefined) updates.name         = body.name
      if (body.sku          !== undefined) updates.sku          = body.sku || undefined
      if (body.price        !== undefined) updates.price        = Number(body.price)
      if (body.comparePrice !== undefined) updates.comparePrice = body.comparePrice ? Number(body.comparePrice) : undefined
      if (body.frameColor   !== undefined) updates.frameColor   = body.frameColor
      if (body.lensColor    !== undefined) updates.lensColor    = body.lensColor
      if (body.stock        !== undefined) updates.stock        = Number(body.stock)
      if (body.description  !== undefined) updates.description  = body.description
      if (body.active       !== undefined) updates.active       = body.active
      if (body.imageUrl     !== undefined) updates.images       = body.imageUrl ? [body.imageUrl] : []

      const product = await Product.findByIdAndUpdate(id, updates, { new: true })
      if (!product) return res.status(404).json({ error: 'Product not found' })
      return res.status(200).json(product)
    }

    if (req.method === 'DELETE') {
      const product = await Product.findByIdAndDelete(id)
      if (!product) return res.status(404).json({ error: 'Product not found' })
      return res.status(200).json({ success: true })
    }

    return res.status(405).json({ error: 'Method not allowed' })
  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
}
