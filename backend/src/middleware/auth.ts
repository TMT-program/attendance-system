import { Request, Response, NextFunction } from 'express'
import { admin } from '../firebase'

export async function verifyToken(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: '認証が必要です' })
  }

  const token = authHeader.slice(7)
  try {
    const decoded = await admin.auth().verifyIdToken(token)
    req.uid = decoded.uid
    req.isAdmin = decoded.admin === true
    next()
  } catch {
    return res.status(401).json({ error: '認証トークンが無効です' })
  }
}

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.isAdmin) {
    return res.status(403).json({ error: '管理者権限が必要です' })
  }
  next()
}
