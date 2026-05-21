import mongoose from 'mongoose'

const customerSchema = new mongoose.Schema({
  name:         { type: String, required: true, trim: true },
  email:        { type: String, required: true, unique: true, lowercase: true, trim: true },
  passwordHash: String,
  passwordSalt: String,
  sessionToken: String,
  tokenExpiry:  Date,
  active:       { type: Boolean, default: true },
  createdAt:    { type: Date, default: Date.now },
})

export default mongoose.models.Customer || mongoose.model('Customer', customerSchema)
