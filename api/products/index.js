import connectDB from '../_lib/db.js'
import Product from '../_lib/Product.js'
import { upload } from '../_lib/cloudinary.js'

export const config = { api: { bodyParser: false } }

function runMiddleware(req, res, fn) {
  return new Promise((resolve, reject) => {
    fn(req, res, (result) => {
      if (result instanceof Error) return reject(result)
      return resolve(result)
    })
  })
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.status(200).end()

  try {
    await connectDB()

    if (req.method === 'GET') {
      const { frameColor, lensColor, search, admin } = req.query
      const query = admin === 'true' ? {} : { active: true }

      if (frameColor) query.frameColor = frameColor
      if (lensColor)  query.lensColor  = lensColor
      if (search) {
        query.$or = [
          { name: new RegExp(search, 'i') },
          { sku:  new RegExp(search, 'i') },
        ]
      }

      const products = await Product.find(query).sort({ createdAt: -1 })
      return res.status(200).json(products)
    }

    if (req.method === 'POST') {
      await runMiddleware(req, res, upload.single('image'))

      const body = req.body || {}
      const data = {
        name:         body.name,
        sku:          body.sku || undefined,
        price:        Number(body.price),
        comparePrice: body.comparePrice ? Number(body.comparePrice) : undefined,
        frameColor:   body.frameColor,
        lensColor:    body.lensColor,
        stock:        Number(body.stock) || 0,
        description:  body.description,
        active:       body.active !== 'false',
      }

      if (req.file) data.images = [req.file.path]

      const product = await Product.create(data)
      return res.status(201).json(product)
    }

    return res.status(405).json({ error: 'Method not allowed' })
  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
}
