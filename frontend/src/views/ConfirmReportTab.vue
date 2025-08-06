<template>
  <div class="confirm-report-tab">
    <div class="summary-table">
      <h3>{{ user.displayName }} さんの勤務実績</h3>
    </div>

    <div class="month-selector">
      <button class="nav-button" @click="prevMonth">←</button>
      <span>{{ year }}年{{ month }}月</span>
      <button class="nav-button" @click="nextMonth">→</button>
    </div>

    <div class="button-group">
      <button class="csv-button" @click="downloadCSV">CSV出力</button>
    </div>

    <LoadingSpinner v-if="isLoading" />

    <table class="record-table" v-else>
      <thead>
        <tr>
          <th>日付</th>
          <th>曜日</th>
          <th>出勤</th>
          <th>退勤</th>
          <th>作業内容</th>
          <th>状態</th>
          <th>操作</th>
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="entry in records"
          :key="entry.fullDate"
          :class="getStatusClass(entry.status)"
        >
          <td>{{ entry.date }}</td>
          <td>{{ entry.day }}</td>
          <td>{{ entry.start || '-' }}</td>
          <td>{{ entry.end || '-' }}</td>
          <td>{{ entry.task || '-' }}</td>
          <td>{{ entry.status }}</td>
          <td>
            <div class="action-buttons">
              <button
                v-if="entry.status === '承認待'"
                class="submit-button"
                @click="approve(entry)"
              >承認</button>
              <button
                v-if="entry.status === '承認待'"
                class="reject-button"
                @click="reject(entry)"
              >却下</button>
              <button
                v-if="entry.status === '承認済'"
                class="cancel-button"
                @click="revoke(entry)"
              >取消</button>
              <span v-if="entry.status === '未承認'">-</span>
            </div>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import axios from 'axios'
import LoadingSpinner from '../components/LoadingSpinner.vue'
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL

const props = defineProps<{
  user: { uid: string; displayName: string }
}>()

interface RecordEntry {
  date: string
  fullDate: string
  day: string
  start?: string
  end?: string
  task?: string
  status: string
}

const year = ref(new Date().getFullYear())
const month = ref(new Date().getMonth() + 1)
const records = ref<RecordEntry[]>([])
const isLoading = ref(false)

const fetchRecords = async () => {
  isLoading.value = true
  try {
    const res = await axios.get(`${API_BASE_URL}/api/attendance`, {
      params: {
        uid: props.user.uid,
        year: year.value,
        month: String(month.value).padStart(2, '0'),
      },
    })
    const data = res.data || {}
    const result: RecordEntry[] = []

    const daysInMonth = new Date(year.value, month.value, 0).getDate()
    for (let d = 1; d <= daysInMonth; d++) {
      const dateObj = new Date(year.value, month.value - 1, d)
      const fullDate = dateObj.toISOString().slice(0, 10)
      const dayIndex = dateObj.getDay()
      const dayNames = ['日', '月', '火', '水', '木', '金', '土']
      const raw = data[fullDate] || {}

      result.push({
        date: `${month.value}/${d}`,
        fullDate,
        day: dayNames[dayIndex],
        start: raw.start || '',
        end: raw.end || '',
        task: raw.task || '',
        status: raw.status || '未承認',
      })
    }

    records.value = result
  } catch (e) {
    console.error('勤務報告取得失敗', e)
  } finally {
    isLoading.value = false
  }
}

const prevMonth = () => {
  if (month.value === 1) {
    year.value--
    month.value = 12
  } else {
    month.value--
  }
  fetchRecords()
}

const nextMonth = () => {
  if (month.value === 12) {
    year.value++
    month.value = 1
  } else {
    month.value++
  }
  fetchRecords()
}

const approve = async (entry: RecordEntry) => {
  try {
    isLoading.value = true
    await axios.post(`${API_BASE_URL}/api/attendance/approve`, {
      uid: props.user.uid,
      date: entry.fullDate,
    })
    await fetchRecords()
  } catch (error) {
    console.error('承認処理エラー:', error)
  } finally {
    isLoading.value = false
  }
}

const reject = async (entry: RecordEntry) => {
  try {
    isLoading.value = true
    await axios.post(`${API_BASE_URL}/api/attendance/reject`, {
      uid: props.user.uid,
      date: entry.fullDate,
    })
    await fetchRecords()
  } catch (error) {
    console.error('却下処理エラー:', error)
  } finally {
    isLoading.value = false
  }
}

const revoke = async (entry: RecordEntry) => {
  try {
    isLoading.value = true
    await axios.post(`${API_BASE_URL}/api/attendance/revoke`, {
      uid: props.user.uid,
      date: entry.fullDate,
    })
    await fetchRecords()
  } catch (error) {
    console.error('取消処理エラー:', error)
  } finally {
    isLoading.value = false
  }
}

const downloadCSV = () => {
  const headers = ['日付', '曜日', '出勤', '退勤', '作業内容', '状態']
  const rows = records.value.map(r => [
    r.date,
    r.day,
    r.start || '-',
    r.end || '-',
    r.task || '-',
    r.status,
  ])
  const csvContent = [headers, ...rows]
    .map(row => row.map(val => `"${val}"`).join(','))
    .join('\r\n')

  const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url

  const username = props.user.displayName.replace(/\s+/g, '_')
  const fileName = `勤務実績_${username}_${year.value}_${String(month.value).padStart(2, '0')}.csv`
  link.setAttribute('download', fileName)

  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

const getStatusClass = (status: string) => {
  if (status === '承認済') return 'status-approved'
  if (status === '承認待') return 'status-pending'
  return ''
}

onMounted(fetchRecords)
watch([year, month], fetchRecords)
</script>

<style scoped>
.confirm-report-tab {
  padding: 1rem;
  max-width: 900px;
  margin: 0 auto;
  font-family: 'Segoe UI', sans-serif;
}
.summary-table {
  text-align: center;
  margin-bottom: 1rem;
}
.month-selector {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1rem;
}
.button-group {
  display: flex;
  justify-content: flex-end;
  margin-bottom: 1rem;
}
.record-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.95rem;
}
.record-table th,
.record-table td {
  border: 1px solid #ccc;
  padding: 0.6rem;
  text-align: center;
  white-space: nowrap;
}
.status-approved {
  background-color: #d9f99d;
}
.status-pending {
  background-color: #fff9c4;
}
.submit-button,
.reject-button,
.cancel-button {
  padding: 0.4rem 0.8rem;
  margin: 0 0.2rem;
  border: none;
  border-radius: 4px;
  font-size: 0.85rem;
  cursor: pointer;
}
.submit-button {
  background-color: #2563eb;
  color: white;
}
.submit-button:hover {
  background-color: #1d4ed8;
}
.reject-button {
  background-color: #f87171;
  color: white;
}
.reject-button:hover {
  background-color: #ef4444;
}
.cancel-button {
  background-color: #fbbf24;
  color: black;
}
.cancel-button:hover {
  background-color: #f59e0b;
}
.csv-button {
  padding: 0.4rem 1rem;
  background-color: #10b981;
  color: white;
  border: none;
  border-radius: 4px;
  font-size: 0.9rem;
  cursor: pointer;
}
.csv-button:hover {
  background-color: #059669;
}
.nav-button {
  padding: 0.4rem 1rem;
  font-size: 0.9rem;
  background-color: #e5e7eb;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}
.nav-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.action-buttons {
  display: flex;
  justify-content: center;
  flex-wrap: wrap;
}

/* スマホ画面用の倍率調整 */
@media (max-width: 600px) {
  .confirm-report-tab {
    transform: scale(0.7);
    transform-origin: top left;
    margin-top: -0.5rem;
  }
  .record-table {
    font-size: 0.8rem;
  }
  .month-selector,
  .button-group {
    margin-bottom: 0.5rem;
  }
}
</style>
