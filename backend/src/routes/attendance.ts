// src/routes/attendance.ts
import express, { Request, Response } from 'express'
import { admin } from '../firebase'

const router = express.Router()

// 出勤時間を記録
router.post('/start', async (req: Request, res: Response) => {
  try {
    const { uid, time } = req.body
    if (!uid || !time) {
      return res.status(400).json({ error: 'uid と time が必要です' })
    }

    const date = new Date(time)
    const yearMonth = time.slice(0, 7) // 'YYYY-MM'
    const day = String(date.getDate()).padStart(2, '0') // '01', '02'など

    const docRef = admin
      .firestore()
      .collection('attendanceRecords')
      .doc(uid)
      .collection('records')
      .doc(yearMonth)

    await docRef.set(
      {
        [day]: { start: time },
      },
      { merge: true }
    )

    res.status(200).json({ message: '出勤時間を記録しました' })
  } catch (error) {
    console.error('出勤記録エラー:', error)
    res.status(500).json({ error: '出勤時間の記録に失敗しました' })
  }
})

// 退勤時間を記録
router.post('/end', async (req: Request, res: Response) => {
  try {
    const { uid, time } = req.body
    if (!uid || !time) {
      return res.status(400).json({ error: 'uid と time が必要です' })
    }

    const date = new Date(time)
    const yearMonth = time.slice(0, 7)
    const day = String(date.getDate()).padStart(2, '0')

    const docRef = admin
      .firestore()
      .collection('attendanceRecords')
      .doc(uid)
      .collection('records')
      .doc(yearMonth)

    await docRef.set(
      {
        [day]: { end: time },
      },
      { merge: true }
    )

    res.status(200).json({ message: '退勤時間を記録しました' })
  } catch (error) {
    console.error('退勤記録エラー:', error)
    res.status(500).json({ error: '退勤時間の記録に失敗しました' })
  }
})

// 勤務実績の取得（年月単位）
router.get('/', async (req: Request, res: Response) => {
  try {
    const uid = req.query.uid as string
    const year = req.query.year as string
    const month = req.query.month as string

    if (!uid || !year || !month) {
      return res.status(400).json({ error: 'uid, year, month が必要です' })
    }

    const yearMonth = `${year}-${month.padStart(2, '0')}`

    const docRef = admin
      .firestore()
      .collection('attendanceRecords')
      .doc(uid)
      .collection('records')
      .doc(yearMonth)

    const doc = await docRef.get()

    if (!doc.exists) {
      return res.json({})
    }

    res.json(doc.data())
  } catch (error) {
    console.error('勤務実績取得エラー:', error)
    res.status(500).json({ error: '勤務実績の取得に失敗しました' })
  }
})

export default router
