import mongoose from 'mongoose'

const userSchema = new mongoose.Schema({
  username:     { type: String, default: 'admin' },
  passwordHash: String,
  passwordSalt: String,
  sessionToken: String,
  tokenExpiry:  Date,
})

export default mongoose.models.User || mongoose.model('User', userSchema)
