import connectDB from '../_lib/db.js'
import Product from '../_lib/Product.js'
import { cloudinary, upload } from '../_lib/cloudinary.js'

export const config = { api: { bodyParser: false } }

function runMiddleware(req, res, fn) {
  return new Promise((resolve, reject) => {
    fn(req, res, (result) => {
      if (result instanceof Error) return reject(result)
      return resolve(result)
    })
  })
}

function extractPublicId(url) {
  // URL format: .../solarilabs/filename.ext
  const match = url.match(/solarilabs\/([^.]+)/)
  return match ? `solarilabs/${match[1]}` : null
}

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
      await runMiddleware(req, res, upload.single('image'))

      const body = req.body || {}
      const updates = {}

      if (body.name !== undefined) updates.name = body.name
      if (body.brand !== undefined) updates.brand = body.brand
      if (body.sku !== undefined) updates.sku = body.sku || undefined
      if (body.price !== undefined) updates.price = Number(body.price)
      if (body.comparePrice !== undefined) updates.comparePrice = body.comparePrice ? Number(body.comparePrice) : undefined
      if (body.category !== undefined) updates.category = body.category
      if (body.gender !== undefined) updates.gender = body.gender
      if (body.frameColor !== undefined) updates.frameColor = body.frameColor
      if (body.lensColor !== undefined) updates.lensColor = body.lensColor
      if (body.material !== undefined) updates.material = body.material
      if (body.uvProtection !== undefined) updates.uvProtection = body.uvProtection
      if (body.polarized !== undefined) updates.polarized = body.polarized === 'true'
      if (body.stock !== undefined) updates.stock = Number(body.stock)
      if (body.description !== undefined) updates.description = body.description
      if (body.featured !== undefined) updates.featured = body.featured === 'true'
      if (body.active !== undefined) updates.active = body.active !== 'false'

      if (req.file) {
        const existing = await Product.findById(id)
        if (existing?.images?.[0]) {
          const publicId = extractPublicId(existing.images[0])
          if (publicId) await cloudinary.uploader.destroy(publicId)
        }
        updates.images = [req.file.path]
      }

      const product = await Product.findByIdAndUpdate(id, updates, { new: true })
      if (!product) return res.status(404).json({ error: 'Product not found' })
      return res.status(200).json(product)
    }

    if (req.method === 'DELETE') {
      const product = await Product.findById(id)
      if (!product) return res.status(404).json({ error: 'Product not found' })

      if (product.images?.length > 0) {
        await Promise.all(
          product.images.map((url) => {
            const publicId = extractPublicId(url)
            return publicId ? cloudinary.uploader.destroy(publicId) : Promise.resolve()
          })
        )
      }

      await Product.findByIdAndDelete(id)
      return res.status(200).json({ success: true })
    }

    return res.status(405).json({ error: 'Method not allowed' })
  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
}
