import { requireAuth } from '../_lib/auth.js'

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization')
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).end()

  const user = await requireAuth(req, res)
  if (!user) return

  user.sessionToken = undefined
  user.tokenExpiry  = undefined
  await user.save()

  return res.status(200).json({ success: true })
}
