// src/routes/attendance.ts
import express, { Request, Response } from 'express'
import { admin } from '../firebase'

const router = express.Router()

// JST日付を抽出する関数（+9時間補正なし）
const getJstDateParts = (isoString: string) => {
  const date = new Date(isoString)

  const jstYear = date.getFullYear()
  const jstMonth = String(date.getMonth() + 1).padStart(2, '0')
  const jstDay = String(date.getDate()).padStart(2, '0')

  return {
    year: jstYear,
    month: jstMonth,
    day: jstDay,
    yearMonth: `${jstYear}-${jstMonth}`,
    fullDate: `${jstYear}-${jstMonth}-${jstDay}`,
  }
}

// 出勤時間を記録
router.post('/start', async (req: Request, res: Response) => {
  try {
    const { uid, time } = req.body
    if (!uid || !time) {
      return res.status(400).json({ error: 'uid と time が必要です' })
    }

    const { yearMonth, fullDate } = getJstDateParts(time)

    const docRef = admin
      .firestore()
      .collection('attendanceRecords')
      .doc(uid)
      .collection('records')
      .doc(yearMonth)

    await docRef.set(
      {
        [fullDate]: { start: time },
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

    const { yearMonth, fullDate } = getJstDateParts(time)

    const docRef = admin
      .firestore()
      .collection('attendanceRecords')
      .doc(uid)
      .collection('records')
      .doc(yearMonth)

    await docRef.set(
      {
        [fullDate]: { end: time },
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

    const rawData = doc.data() || {}

    // レスポンスのキーは fullDate（YYYY-MM-DD）
    res.json(rawData)
  } catch (error) {
    console.error('勤務実績取得エラー:', error)
    res.status(500).json({ error: '勤務実績の取得に失敗しました' })
  }
})

export default router
