import mongoose from 'mongoose'

const itemSchema = new mongoose.Schema({
  productId:  { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
  name:       String,
  sku:        String,
  frameColor: String,
  lensColor:  String,
  price:      Number,
  quantity:   { type: Number, required: true, min: 1 },
  subtotal:   Number,
}, { _id: false })

const saleSchema = new mongoose.Schema({
  items:     [itemSchema],
  total:     { type: Number, required: true },
  notes:     String,
  createdAt: { type: Date, default: Date.now },
})

export default mongoose.models.Sale || mongoose.model('Sale', saleSchema)
