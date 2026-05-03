import express, { Request, Response } from 'express'
import { admin } from '../firebase'
import { verifyToken, requireAdmin } from '../middleware/auth'

const router = express.Router()

// POST /api/users - 管理者のみ
router.post('/', verifyToken, requireAdmin, async (req: Request, res: Response) => {
  const { email, password, displayName } = req.body

  if (!email || !password) {
    return res.status(400).json({ error: 'メールアドレスとパスワードは必須です' })
  }

  try {
    const userRecord = await admin.auth().createUser({
      email,
      password,
      displayName,
    })

    await admin.firestore().collection('users').doc(userRecord.uid).set({
      email,
      displayName: displayName || '',
      isAdmin: false,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    })

    res.status(201).json({ uid: userRecord.uid, email: userRecord.email })
  } catch (error: any) {
    console.error('ユーザー作成エラー:', error)
    res.status(500).json({ error: 'ユーザー作成に失敗しました' })
  }
})

// GET /api/users - 管理者のみ
router.get('/', verifyToken, requireAdmin, async (req: Request, res: Response) => {
  try {
    const usersSnapshot = await admin.firestore().collection('users').get()
    const users: any[] = []

    usersSnapshot.forEach(doc => {
      users.push({ uid: doc.id, ...doc.data() })
    })

    res.json(users)
  } catch (error) {
    console.error('ユーザー一覧取得エラー:', error)
    res.status(500).json({ error: 'ユーザー一覧の取得に失敗しました。' })
  }
})

// DELETE /api/users/:uid - 管理者のみ
router.delete('/:uid', verifyToken, requireAdmin, async (req: Request, res: Response) => {
  const uid = req.params.uid

  if (!uid) {
    return res.status(400).json({ error: 'UIDが指定されていません。' })
  }

  try {
    await admin.auth().deleteUser(uid)
    await admin.firestore().collection('users').doc(uid).delete()

    res.status(200).json({ message: `ユーザー（${uid}）を削除しました。` })
  } catch (error: any) {
    console.error('ユーザー削除エラー:', error)
    res.status(500).json({ error: 'ユーザー削除に失敗しました。' })
  }
})

// PATCH /api/users/:uid/role - 管理者のみ
router.patch('/:uid/role', verifyToken, requireAdmin, async (req: Request, res: Response) => {
  const uid = req.params.uid
  const { isAdmin } = req.body

  if (typeof isAdmin !== 'boolean') {
    return res.status(400).json({ error: 'isAdmin（true/false）の指定が必要です。' })
  }

  try {
    await admin.auth().setCustomUserClaims(uid, { admin: isAdmin })
    await admin.firestore().collection('users').doc(uid).update({ isAdmin })

    res.status(200).json({ message: `ユーザー（${uid}）の管理者権限を ${isAdmin ? '付与' : '解除'}しました。` })
  } catch (error: any) {
    console.error('管理者権限変更エラー:', error)
    res.status(500).json({ error: '管理者権限の変更に失敗しました。' })
  }
})

export default router
