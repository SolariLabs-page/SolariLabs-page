import { createHash } from 'crypto'

export async function uploadImage(base64DataUri) {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME
  const apiKey    = process.env.CLOUDINARY_API_KEY
  const apiSecret = process.env.CLOUDINARY_API_SECRET

  if (!cloudName || !apiKey || !apiSecret) {
    throw new Error('Cloudinary no está configurado en las variables de entorno')
  }

  const timestamp = Math.floor(Date.now() / 1000)
  const folder    = 'solarilabs'

  const signature = createHash('sha1')
    .update(`folder=${folder}&timestamp=${timestamp}${apiSecret}`)
    .digest('hex')

  const form = new FormData()
  form.append('file',      base64DataUri)
  form.append('api_key',   apiKey)
  form.append('timestamp', String(timestamp))
  form.append('signature', signature)
  form.append('folder',    folder)

  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
    { method: 'POST', body: form }
  )

  const data = await res.json()
  if (!res.ok) throw new Error(data.error?.message || 'Error al subir imagen')

  return data.secure_url
}
