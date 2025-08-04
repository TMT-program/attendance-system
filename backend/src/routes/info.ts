import express from 'express'
import multer from 'multer'
import { admin } from '../firebase'

const router = express.Router()
const db = admin.firestore()
const bucket = admin.storage().bucket()

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
})

// 一覧取得: Firestore からファイル名を取得し、StorageのURLを返す
router.get('/', async (req, res) => {
  try {
    const snapshot = await db.collection('announcements').get()
    const files: { name: string; url: string }[] = []

    for (const doc of snapshot.docs) {
      const encodedName = doc.id
      const decodedName = decodeURIComponent(encodedName)
      const file = bucket.file(`announcements/${encodedName}`)

      const [exists] = await file.exists()
      if (!exists) {
        // StorageにファイルがなければFirestoreからも削除（任意）
        await db.collection('announcements').doc(encodedName).delete()
        continue
      }

      const [url] = await file.getSignedUrl({
        action: 'read',
        expires: '03-01-2030', // 必要に応じて有効期限変更
      })

      files.push({ name: decodedName, url })
    }

    res.json(files)
  } catch (error) {
    console.error('Firestore or Storage取得失敗', error)
    res.status(500).json({ error: '一覧取得に失敗しました' })
  }
})

// アップロード: 複数 PDF を受け取って Storage + Firestore に保存
router.post('/upload', upload.array('files'), async (req, res) => {
  console.log('受け取ったファイル', req.files)
  if (!req.files || !(req.files instanceof Array)) {
    return res.status(400).json({ error: 'ファイルが見つかりません' })
  }

  const errors: string[] = []

  await Promise.all(req.files.map(async (file: Express.Multer.File) => {
    const originalName = file.originalname
    const encodedName = encodeURIComponent(originalName)

    // 拡張子チェック
    if (!originalName.endsWith('.pdf')) {
      errors.push(`${originalName} はPDFではありません`)
      return
    }

    // 同名チェック
    const exists = await db.collection('announcements').doc(encodedName).get()
    if (exists.exists) {
      errors.push(`${originalName} はすでに存在しています`)
      return
    }

    try {
      // Storageに保存
      const blob = bucket.file(`announcements/${encodedName}`)
      await blob.save(file.buffer, {
        contentType: file.mimetype,
        metadata: { firebaseStorageDownloadTokens: Date.now().toString() },
      })

      // Firestoreに保存
      await db.collection('announcements').doc(encodedName).set({
        uploadedAt: admin.firestore.FieldValue.serverTimestamp(),
      })
    } catch (e) {
      console.error(`アップロード失敗: ${originalName}`, e)
      errors.push(`${originalName} のアップロードに失敗しました`)
    }
  }))

  if (errors.length > 0) {
    return res.status(400).json({ errors })
  }

  res.status(200).json({ message: 'アップロード成功' })
})

// 削除: ファイル名で Storage + Firestore 両方から削除
router.delete('/:filename', async (req, res) => {
  const filename = req.params.filename
  if (!filename.endsWith('.pdf')) {
    return res.status(400).json({ error: 'PDFファイル名が必要です' })
  }

  const encodedName = encodeURIComponent(filename)

  try {
    // Storageから削除
    await bucket.file(`announcements/${encodedName}`).delete()

    // Firestoreから削除
    await db.collection('announcements').doc(encodedName).delete()

    res.status(200).json({ message: '削除成功' })
  } catch (err) {
    console.error('削除失敗:', err)
    res.status(500).json({ error: '削除に失敗しました' })
  }
})

export default router
