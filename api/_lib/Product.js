import mongoose from 'mongoose'

const productSchema = new mongoose.Schema({
  name:         { type: String, required: true },
  sku:          { type: String, unique: true, sparse: true },
  price:        { type: Number, required: true },
  comparePrice: { type: Number },
  frameColor:   { type: String, enum: ['transparente-claro', 'transparente-oscuro'], required: true },
  lensColor:    { type: String, enum: ['rojo', 'naranja', 'amarillo'], required: true },
  stock:        { type: Number, default: 0, min: 0 },
  images:       [String],
  description:  { type: String },
  active:       { type: Boolean, default: true },
  createdAt:    { type: Date, default: Date.now },
})

export default mongoose.models.Product || mongoose.model('Product', productSchema)
