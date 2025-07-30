// src/routes/users.ts
import express, { Request, Response } from 'express'
import { admin } from '../firebase'

const router = express.Router()

// POST /api/users
router.post('/', async (req: Request, res: Response) => {
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
      isAdmin: false, // 初期はfalseで登録
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    })

    res.status(201).json({ uid: userRecord.uid, email: userRecord.email })
  } catch (error: any) {
    console.error(error)
    res.status(500).json({ error: error.message || 'ユーザー作成に失敗しました' })
  }
})

// GET /api/users
router.get('/', async (req: Request, res: Response) => {
  try {
    const usersSnapshot = await admin.firestore().collection('users').get()
    const users: any[] = []

    usersSnapshot.forEach(doc => {
      users.push({ uid: doc.id, ...doc.data() })
    })

    res.json(users)
  } catch (error) {
    console.error('Failed to fetch users:', error)
    res.status(500).json({ error: 'ユーザー一覧の取得に失敗しました。' })
  }
})

// DELETE /api/users/:uid
router.delete('/:uid', async (req: Request, res: Response) => {
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

// PATCH /api/users/:uid/role
router.patch('/:uid/role', async (req: Request, res: Response) => {
  const uid = req.params.uid
  const { isAdmin } = req.body

  if (typeof isAdmin !== 'boolean') {
    return res.status(400).json({ error: 'isAdmin（true/false）の指定が必要です。' })
  }

  try {
    // Firebase Authentication にカスタムクレームを設定
    await admin.auth().setCustomUserClaims(uid, { admin: isAdmin })

    // Firestore にも反映（任意）
    await admin.firestore().collection('users').doc(uid).update({
      isAdmin: isAdmin
    })

    res.status(200).json({ message: `ユーザー（${uid}）の管理者権限を ${isAdmin ? '付与' : '解除'}しました。` })
  } catch (error: any) {
    console.error('管理者権限変更エラー:', error)
    res.status(500).json({ error: '管理者権限の変更に失敗しました。' })
  }
})

export default router
