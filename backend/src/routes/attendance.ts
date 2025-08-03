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
    const year = req.query.year
    const month = req.query.month

    if (!uid || !year || !month) {
      return res.status(400).json({ error: 'uid, year, month が必要です' })
    }

    const yearStr = String(year)
    const monthStr = String(month).padStart(2, '0')
    const yearMonth = `${yearStr}-${monthStr}`

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
    const responseData: Record<string, any> = {}

    for (const dayKey in rawData) {
      const record = rawData[dayKey]
      const [m, d] = dayKey.split('-')
      const fullDate = `${yearStr}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`

      responseData[fullDate] = {
        start: record.start || null,
        end: record.end || null,
        task: record.task || '',
        status: record.status || '未承認',
      }
    }

    res.json(responseData)
  } catch (error) {
    console.error('勤務実績取得エラー:', error)
    res.status(500).json({ error: '勤務実績の取得に失敗しました' })
  }
})

// 勤務報告の保存（作業内容・ステータス・時刻）
router.post('/report', async (req: Request, res: Response) => {
  try {
    const { uid, date, start, end, task, status } = req.body

    if (!uid || !date || !task || !status) {
      return res.status(400).json({ error: 'uid, date, task, status は必須です' })
    }

    const dateObj = new Date(date)
    if (isNaN(dateObj.getTime())) {
      return res.status(400).json({ error: '無効な日付です' })
    }

    const year = dateObj.getFullYear()
    const month = String(dateObj.getMonth() + 1).padStart(2, '0')
    const day = String(dateObj.getDate()).padStart(2, '0')

    const yearMonth = `${year}-${month}`
    const dayKey = `${month}-${day}`

    const docRef = admin
      .firestore()
      .collection('attendanceRecords')
      .doc(uid)
      .collection('records')
      .doc(yearMonth)

    const updateData: any = {
      [dayKey]: {
        task,
        status,
      },
    }

    if (start) updateData[dayKey].start = start
    if (end) updateData[dayKey].end = end

    await docRef.set(updateData, { merge: true })

    res.status(200).json({ message: '勤務報告を保存しました' })
  } catch (error) {
    console.error('勤務報告保存エラー:', error)
    res.status(500).json({ error: '勤務報告の保存に失敗しました' })
  }
})

// 勤務報告の「承認」処理（status: 承認済）
router.post('/approve', async (req: Request, res: Response) => {
  try {
    const { uid, date } = req.body
    if (!uid || !date) {
      return res.status(400).json({ error: 'uid と date は必須です' })
    }

    const dateObj = new Date(date)
    if (isNaN(dateObj.getTime())) {
      return res.status(400).json({ error: '無効な日付です' })
    }

    const year = dateObj.getFullYear()
    const month = String(dateObj.getMonth() + 1).padStart(2, '0')
    const day = String(dateObj.getDate()).padStart(2, '0')

    const yearMonth = `${year}-${month}`
    const dayKey = `${month}-${day}`

    const docRef = admin
      .firestore()
      .collection('attendanceRecords')
      .doc(uid)
      .collection('records')
      .doc(yearMonth)

    await docRef.set(
      {
        [dayKey]: {
          status: '承認済',
        },
      },
      { merge: true }
    )

    res.status(200).json({ message: '勤務報告を承認しました' })
  } catch (error) {
    console.error('勤務報告承認エラー:', error)
    res.status(500).json({ error: '勤務報告の承認に失敗しました' })
  }
})

// 勤務報告の「却下」処理（status: 未承認）
router.post('/reject', async (req: Request, res: Response) => {
  try {
    const { uid, date } = req.body
    if (!uid || !date) {
      return res.status(400).json({ error: 'uid と date は必須です' })
    }

    const dateObj = new Date(date)
    if (isNaN(dateObj.getTime())) {
      return res.status(400).json({ error: '無効な日付です' })
    }

    const year = dateObj.getFullYear()
    const month = String(dateObj.getMonth() + 1).padStart(2, '0')
    const day = String(dateObj.getDate()).padStart(2, '0')

    const yearMonth = `${year}-${month}`
    const dayKey = `${month}-${day}`

    const docRef = admin
      .firestore()
      .collection('attendanceRecords')
      .doc(uid)
      .collection('records')
      .doc(yearMonth)

    await docRef.set(
      {
        [dayKey]: {
          status: '未承認',
        },
      },
      { merge: true }
    )

    res.status(200).json({ message: '勤務報告を却下しました' })
  } catch (error) {
    console.error('勤務報告却下エラー:', error)
    res.status(500).json({ error: '勤務報告の却下に失敗しました' })
  }
})

// 勤務報告の「取消」処理（status: 承認待）
router.post('/revoke', async (req: Request, res: Response) => {
  try {
    const { uid, date } = req.body
    if (!uid || !date) {
      return res.status(400).json({ error: 'uid と date は必須です' })
    }

    const dateObj = new Date(date)
    if (isNaN(dateObj.getTime())) {
      return res.status(400).json({ error: '無効な日付です' })
    }

    const year = dateObj.getFullYear()
    const month = String(dateObj.getMonth() + 1).padStart(2, '0')
    const day = String(dateObj.getDate()).padStart(2, '0')

    const yearMonth = `${year}-${month}`
    const dayKey = `${month}-${day}`

    const docRef = admin
      .firestore()
      .collection('attendanceRecords')
      .doc(uid)
      .collection('records')
      .doc(yearMonth)

    await docRef.set(
      {
        [dayKey]: {
          status: '承認待',
        },
      },
      { merge: true }
    )

    res.status(200).json({ message: '勤務報告の承認を取り消しました' })
  } catch (error) {
    console.error('勤務報告取消エラー:', error)
    res.status(500).json({ error: '勤務報告の取消に失敗しました' })
  }
})

export default router
