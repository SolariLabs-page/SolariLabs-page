import mongoose from 'mongoose'

let cached = global.mongoose || { conn: null, promise: null }
global.mongoose = cached

export default async function connectDB() {
  const MONGODB_URI = process.env.MONGODB_URI
  if (!MONGODB_URI) throw new Error('MONGODB_URI no está configurada en las variables de entorno')

  if (cached.conn) return cached.conn

  if (!cached.promise) {
    cached.promise = mongoose.connect(MONGODB_URI, {
      bufferCommands:            false,
      serverSelectionTimeoutMS:  5000,   // falla rápido si Atlas no responde
      connectTimeoutMS:          8000,
    })
  }

  cached.conn = await cached.promise
  return cached.conn
}
