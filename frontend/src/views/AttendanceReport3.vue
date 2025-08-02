<template>
  <div class="attendance-report">
    <div class="header">
      <Clock4 class="icon" />
      <h1 class="title">勤務報告</h1>
    </div>

    <div v-if="!uid" class="loading">ユーザー情報を取得中...</div>

    <div v-else>
      <!-- タブ -->
      <div class="tab-menu">
        <button
          v-for="tab in tabs"
          :key="tab"
          :class="['tab-button', { active: currentTab === tab }]"
          @click="currentTab = tab"
        >
          {{ tab }}
        </button>
      </div>

      <div class="tab-content">
        <!-- 勤怠タブ -->
        <div v-show="currentTab === '勤怠'" class="tab-panel">
          <div class="actions">
            <button @click="clockIn" :disabled="!!attendance.start">出勤</button>
            <button @click="clockOut" :disabled="!attendance.start || !!attendance.end">退勤</button>
          </div>
          <div v-if="attendance.start" class="record">✅ {{ attendance.start }} に出勤しました</div>
          <div v-if="attendance.end" class="record">✅ {{ attendance.end }} に退勤しました</div>
        </div>

        <!-- 勤務実績タブ -->
        <div v-show="currentTab === '勤務実績'" class="tab-panel">
          <div class="month-selector">
            <button @click="prevMonth">←</button>
            <span>{{ year }}年{{ month }}月</span>
            <button @click="nextMonth">→</button>
          </div>

          <table class="record-table">
            <thead>
              <tr>
                <th>日付</th>
                <th>曜日</th>
                <th>出勤</th>
                <th>退勤</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="entry in records"
                :key="entry.fullDate"
                :class="{ holiday: isWeekend(entry.dayIndex) }"
              >
                <td>{{ entry.date }}</td>
                <td>{{ entry.day }}</td>
                <td>{{ entry.start || '-' }}</td>
                <td>{{ entry.end || '-' }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Clock4 } from 'lucide-vue-next'
import { ref, onMounted } from 'vue'
import axios from 'axios'
import { auth } from '../firebase'
import { onAuthStateChanged } from 'firebase/auth'

const API_BASE_URL = 'http://localhost:3000'

type TabType = '勤怠' | '勤務実績'
const tabs: TabType[] = ['勤怠', '勤務実績']
const currentTab = ref<TabType>('勤怠')

const uid = ref<string | null>(null)
const attendance = ref<{ start?: string; end?: string }>({})

onAuthStateChanged(auth, (user) => {
  if (user) {
    uid.value = user.uid
    fetchRecords()
  } else {
    uid.value = null
  }
})

const clockIn = async () => {
  const now = new Date()
  attendance.value.start = now.toLocaleTimeString()
  try {
    await axios.post(`${API_BASE_URL}/api/attendance/start`, {
      uid: uid.value,
      time: now.toISOString(),
    })
    await fetchRecords()
  } catch (e) {
    console.error('出勤登録失敗', e)
  }
}

const clockOut = async () => {
  const now = new Date()
  attendance.value.end = now.toLocaleTimeString()
  try {
    await axios.post(`${API_BASE_URL}/api/attendance/end`, {
      uid: uid.value,
      time: now.toISOString(),
    })
    await fetchRecords()
  } catch (e) {
    console.error('退勤登録失敗', e)
  }
}

const year = ref(new Date().getFullYear())
const month = ref(new Date().getMonth() + 1)

interface RecordEntry {
  date: string
  fullDate: string
  day: string
  dayIndex: number
  start?: string
  end?: string
}

const records = ref<RecordEntry[]>([])

const fetchRecords = async () => {
  if (!uid.value) return
  const daysInMonth = new Date(year.value, month.value, 0).getDate()
  try {
    const res = await axios.get(`${API_BASE_URL}/api/attendance`, {
      params: {
        uid: uid.value,
        year: year.value,
        month: String(month.value).padStart(2, '0'),
      },
    })
    const data = (res.data || {}) as { [date: string]: { start?: string; end?: string } }

    const result: RecordEntry[] = []
    for (let d = 1; d <= daysInMonth; d++) {
      const dateObj = new Date(year.value, month.value - 1, d)
      const full = dateObj.toISOString().slice(0, 10)
      const dayIndex = dateObj.getDay()
      const dayNames = ['日', '月', '火', '水', '木', '金', '土']
      result.push({
        date: `${month.value}/${d}`,
        fullDate: full,
        day: dayNames[dayIndex],
        dayIndex,
        start: data[String(d)]?.start?.slice(11, 16),
        end: data[String(d)]?.end?.slice(11, 16),
      })
    }
    records.value = result

    const todayStr = new Date().toISOString().slice(0, 10)
    const todayData = data[todayStr]
    if (todayData) {
      attendance.value.start = todayData.start?.slice(11, 16)
      attendance.value.end = todayData.end?.slice(11, 16)
    }
  } catch (e) {
    console.error('勤務実績取得失敗', e)
  }
}

const isWeekend = (dayIndex: number) => dayIndex === 0 || dayIndex === 6

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
</script>

<style scoped>
.attendance-report {
  padding: 2rem 1rem;
  max-width: 900px;
  margin: 0 auto;
  font-family: 'Segoe UI', sans-serif;
}

.header {
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 1.5rem;
  gap: 0.5rem;
}
.icon {
  width: 28px;
  height: 28px;
  color: #1e3a8a;
}
.title {
  font-size: 1.8rem;
  font-weight: bold;
  color: #1e3a8a;
}

.tab-menu {
  display: flex;
  justify-content: center;
  border-bottom: 1px solid #ccc;
  margin-bottom: 1rem;
}

.tab-button {
  background: none;
  border: none;
  padding: 0.75rem 1.5rem;
  font-size: 1rem;
  font-weight: 500;
  cursor: pointer;
  color: #1e3a8a;
  transition: all 0.2s;
  position: relative;
  outline: none;
}
.tab-button.active {
  color: #2563eb;
  font-weight: 600;
}
.tab-button.active::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 25%;
  width: 50%;
  height: 2px;
  background-color: #2563eb;
  border-radius: 2px;
}

.tab-content {
  min-height: 300px;
}

.tab-panel {
  animation: fadeIn 0.3s ease-in-out;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
}

.actions {
  display: flex;
  justify-content: center;
  gap: 1rem;
  margin-top: 1rem;
}
.actions button {
  padding: 0.7rem 2rem;
  font-size: 1rem;
  background-color: #1e40af;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
}
.actions button:disabled {
  background-color: #9ca3af;
  cursor: not-allowed;
}

.record {
  text-align: center;
  margin-top: 1rem;
  font-weight: bold;
  color: #065f46;
}

.month-selector {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1rem;
}
.month-selector button {
  padding: 0.4rem 0.8rem;
  font-size: 1rem;
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
.record-table tr.holiday {
  background-color: #ffecec;
}
</style>
