<template>
  <div class="report-container">
    <div class="summary-table">
      <table>
        <tr>
          <th>ユーザー名</th>
          <td>{{ username }}</td>
        </tr>
        <tr>
          <th>勤務時間合計</th>
          <td>{{ totalWorkTime }}</td>
        </tr>
        <tr>
          <th>休暇日数</th>
          <td>5/20</td>
        </tr>
      </table>
    </div>

    <div class="main-content">
      <div class="month-selector">
        <button @click="prevMonth">←</button>
        <span>{{ year }}年{{ month }}月</span>
        <button @click="nextMonth">→</button>
      </div>

      <table class="record-table">
        <thead>
          <tr>
            <th>状態</th>
            <th>日付</th>
            <th>曜日</th>
            <th>出勤</th>
            <th>退勤</th>
            <th>勤務時間</th>
            <th>作業内容</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="entry in records"
            :key="entry.fullDate"
            :class="getStatusClass(entry.status, entry.dayIndex)"
          >
            <td>{{ entry.status }}</td>
            <td>{{ entry.date }}</td>
            <td>{{ entry.day }}</td>
            <td>{{ entry.start || '-' }}</td>
            <td>{{ entry.end || '-' }}</td>
            <td>{{ entry.workTime || '-' }}</td>
            <td>
              <select v-model="entry.task" :disabled="entry.status !== '未承認'">
                <option value="">-</option>
                <option v-for="opt in taskOptions" :key="opt" :value="opt">{{ opt }}</option>
              </select>
            </td>
            <td>
              <button
                class="action-button"
                v-if="entry.status === '未承認'"
                @click="submitReport(entry)"
              >
                提出
              </button>
              <button
                class="action-button"
                v-else-if="entry.status === '承認待'"
                @click="cancelSubmission(entry)"
              >
                取消
              </button>
              <span v-else>-</span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import axios from 'axios'

const props = defineProps<{ uid: string }>()

const year = ref(new Date().getFullYear())
const month = ref(new Date().getMonth() + 1)
const username = ref('ユーザー名')

const taskOptions = ['現場作業', '資料作成', '営業', '顧客対応', '休暇']

interface RecordEntry {
  date: string
  fullDate: string
  day: string
  dayIndex: number
  start?: string
  end?: string
  workTime?: string
  task?: string
  status: '未承認' | '承認待' | '承認済'
}

const records = ref<RecordEntry[]>([])
const totalWorkTime = ref('00:00')

const calculateWorkDuration = (startStr?: string, endStr?: string): string | undefined => {
  if (!startStr || !endStr) return undefined
  const [sh, sm] = startStr.split(':').map(Number)
  const [eh, em] = endStr.split(':').map(Number)
  const startMin = sh * 60 + sm
  const endMin = eh * 60 + em
  if (endMin < startMin) return undefined
  const diffMin = endMin - startMin
  return `${String(Math.floor(diffMin / 60)).padStart(2, '0')}:${String(diffMin % 60).padStart(2, '0')}`
}

const computeTotalWorkTime = () => {
  let totalMin = 0
  for (const entry of records.value) {
    if (entry.workTime) {
      const [h, m] = entry.workTime.split(':').map(Number)
      totalMin += h * 60 + m
    }
  }
  const h = Math.floor(totalMin / 60)
  const m = totalMin % 60
  totalWorkTime.value = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

const fetchRecords = async () => {
  const daysInMonth = new Date(year.value, month.value, 0).getDate()
  try {
    const res = await axios.get('http://localhost:3000/api/attendance', {
      params: {
        uid: props.uid,
        year: year.value,
        month: String(month.value).padStart(2, '0'),
      },
    })
    const data = res.data || {}
    const result: RecordEntry[] = []

    for (let d = 1; d <= daysInMonth; d++) {
      const dateObj = new Date(Date.UTC(year.value, month.value - 1, d))
      const full = dateObj.toISOString().slice(0, 10)
      const dayIndex = dateObj.getUTCDay()
      const dayNames = ['日', '月', '火', '水', '木', '金', '土']

      const raw = data[full] || {}
      const start = raw.start
      const end = raw.end
      const workTime = calculateWorkDuration(start, end)

      result.push({
        date: `${month.value}/${d}`,
        fullDate: full,
        day: dayNames[dayIndex],
        dayIndex,
        start,
        end,
        workTime,
        task: raw.task || '',
        status: raw.status || '未承認',
      })
    }

    records.value = result
    computeTotalWorkTime()
  } catch (e) {
    console.error('勤務実績取得失敗', e)
  }
}

onMounted(fetchRecords)
watch([year, month], fetchRecords)

const prevMonth = () => {
  if (month.value === 1) {
    year.value--
    month.value = 12
  } else {
    month.value--
  }
}
const nextMonth = () => {
  if (month.value === 12) {
    year.value++
    month.value = 1
  } else {
    month.value++
  }
}

const isWeekend = (i: number) => i === 0 || i === 6

const submitReport = async (entry: RecordEntry) => {
  if (!entry.task) {
    alert('作業内容を選択してください')
    return
  }

  if (entry.task !== '休暇') {
    if (!entry.start || !entry.end) {
      alert('出勤時間と退勤時間を入力してください')
      return
    }
  }

  try {
    await axios.post('http://localhost:3000/api/attendance/report', {
      uid: props.uid,
      date: entry.fullDate,
      start: entry.start,
      end: entry.end,
      task: entry.task,
      status: '承認待'
    })
    entry.status = '承認待'
  } catch (error) {
    console.error('勤務報告の送信に失敗しました:', error)
    alert('勤務報告の送信に失敗しました')
  }
}

const cancelSubmission = async (entry: RecordEntry) => {
  try {
    await axios.post('http://localhost:3000/api/attendance/report', {
      uid: props.uid,
      date: entry.fullDate,
      start: entry.start,
      end: entry.end,
      task: entry.task,
      status: '未承認'
    })
    entry.status = '未承認'
  } catch (error) {
    console.error('勤務報告の取消に失敗しました:', error)
    alert('取消に失敗しました')
  }
}

const getStatusClass = (status: string, dayIndex: number) => {
  if (status === '承認済') return 'status-approved'
  if (status === '承認待') return 'status-pending'
  return isWeekend(dayIndex) ? 'status-unsubmitted-weekend' : 'status-unsubmitted'
}
</script>

<style scoped>
.report-container {
  display: flex;
  align-items: flex-start;
  gap: 2rem;
}
.summary-table {
  min-width: 200px;
  margin-top: 2.8rem;
}
.summary-table table {
  border-collapse: collapse;
  width: 100%;
}
.summary-table th,
.summary-table td {
  padding: 0.4rem 0.6rem;
  border: 1px solid #ccc;
  text-align: left;
  font-size: 0.95rem;
}
.summary-table th {
  background-color: #f0f0f0;
}
.main-content {
  flex: 1;
}
.month-selector {
  display: flex;
  justify-content: center;
  gap: 1rem;
  margin-bottom: 1rem;
}
.record-table {
  width: 100%;
  border-collapse: collapse;
}
.record-table th,
.record-table td {
  border: 1px solid #ddd;
  padding: 0.6rem;
  text-align: center;
}
.record-table th {
  background-color: #f3f4f6;
}
.status-unsubmitted {
  background-color: white;
}
.status-unsubmitted-weekend {
  background-color: #ffecec;
}
.status-pending {
  background-color: #fff9c4;
}
.status-approved {
  background-color: #d9f99d;
}
.action-button {
  width: 64px;
  padding: 0.4rem;
  font-size: 0.9rem;
  background-color: #1e40af;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}
.action-button:hover {
  background-color: #1d4ed8;
}
</style>
