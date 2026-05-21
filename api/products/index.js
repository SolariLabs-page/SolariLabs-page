import connectDB from '../_lib/db.js'
import Product from '../_lib/Product.js'
import { requireAuth } from '../_lib/auth.js'
import { uploadImage } from '../_lib/cloudinary.js'

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization')
  if (req.method === 'OPTIONS') return res.status(200).end()

  // GET es público — no requiere auth
  if (req.method !== 'GET') {
    const user = await requireAuth(req, res)
    if (!user) return
  }

  try {
    await connectDB()

    if (req.method === 'GET') {
      const { frameColor, lensColor, search, admin } = req.query
      const query = admin === 'true' ? {} : { active: true }

      if (frameColor) query.frameColor = frameColor
      if (lensColor)  query.lensColor  = lensColor
      if (search) {
        const safe = escapeRegex(search.trim().slice(0, 100))
        query.$or = [
          { name: new RegExp(safe, 'i') },
          { sku:  new RegExp(safe, 'i') },
        ]
      }

      const products = await Product.find(query).sort({ createdAt: -1 })
      return res.status(200).json(products)
    }

    if (req.method === 'POST') {
      const body = req.body || {}

      if (body.imageBase64 && body.imageBase64.length > 6_000_000) {
        return res.status(400).json({ error: 'La imagen no puede superar 4MB' })
      }

      let imageUrl = body.imageUrl || ''
      if (body.imageBase64) {
        imageUrl = await uploadImage(body.imageBase64)
      }

      const data = {
        name:        body.name,
        sku:         body.sku       || undefined,
        price:       Number(body.price),
        frameColor:  body.frameColor,
        lensColor:   body.lensColor,
        stock:       Number(body.stock) || 0,
        description: body.description,
        active:      body.active !== false,
        images:      imageUrl ? [imageUrl] : [],
      }

      const product = await Product.create(data)
      return res.status(201).json(product)
    }

    return res.status(405).json({ error: 'Method not allowed' })
  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
}
