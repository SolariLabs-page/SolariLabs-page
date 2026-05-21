import mongoose from 'mongoose'

const itemSchema = new mongoose.Schema({
  productId:  mongoose.Schema.Types.ObjectId,
  name:       String,
  frameColor: String,
  lensColor:  String,
  price:      Number,
  quantity:   Number,
  subtotal:   Number,
  image:      String,
}, { _id: false })

const orderSchema = new mongoose.Schema({
  customer: {
    id:    mongoose.Schema.Types.ObjectId,
    name:  String,
    email: String,
  },
  items:    [itemSchema],
  shipping: {
    method:  { type: String, enum: ['correos', 'uber-rappi'] },
    address: String,
    lat:     Number,
    lng:     Number,
  },
  notes:   String,
  total:   { type: Number, required: true },
  status:  {
    type:    String,
    enum:    ['pendiente', 'confirmado', 'en-proceso', 'enviado', 'entregado', 'cancelado'],
    default: 'pendiente',
  },
  createdAt: { type: Date, default: Date.now },
})

export default mongoose.models.Order || mongoose.model('Order', orderSchema)
