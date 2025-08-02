<script setup lang="ts">
import { Clock4 } from 'lucide-vue-next'
import { ref, onMounted, computed } from 'vue'
import { onAuthStateChanged } from 'firebase/auth'
import { auth } from '../firebase'
import axios from 'axios'

import AttendanceTab from './AttendanceTab.vue'
import ReportTab from './ReportTab.vue'

type TabType = '勤怠' | '勤務実績'
const tabs: TabType[] = ['勤怠', '勤務実績']
const currentTab = ref<TabType>('勤怠')

const uid = ref<string | null>(null)
const attendance = ref<{ start?: string; end?: string }>({})

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

// JSTに変換して "HH:MM" 表示する関数
const toJSTTimeString = (iso: string): string => {
  const date = new Date(iso)
  date.setHours(date.getHours())
  return date.toTimeString().slice(0, 5)
}

onMounted(() => {
  onAuthStateChanged(auth, (user) => {
    if (user) {
      uid.value = user.uid
      fetchRecords()
    }
  })
})

const fetchRecords = async () => {
  if (!uid.value) return

  const daysInMonth = new Date(year.value, month.value, 0).getDate()

  try {
    const res = await axios.get('http://localhost:3000/api/attendance', {
      params: {
        uid: uid.value,
        year: year.value,
        month: String(month.value).padStart(2, '0'),
      },
    })
    const data = res.data || {}

    const result: RecordEntry[] = []
    for (let d = 1; d <= daysInMonth; d++) {
      const dateObj = new Date(year.value, month.value - 1, d)
      const fullDate = dateObj.toISOString().slice(0, 10)
      const dayIndex = dateObj.getDay()
      const dayNames = ['日', '月', '火', '水', '木', '金', '土']
      result.push({
        date: `${month.value}/${d}`,
        fullDate,
        day: dayNames[dayIndex],
        dayIndex,
        start: data[fullDate]?.start ? toJSTTimeString(data[fullDate].start) : undefined,
        end: data[fullDate]?.end ? toJSTTimeString(data[fullDate].end) : undefined,
      })
    }
    records.value = result

    // 当日出勤情報もセット
    const todayStr = new Date().toISOString().slice(0, 10)
    const todayData = data[todayStr]
    if (todayData) {
      attendance.value.start = todayData.start ? toJSTTimeString(todayData.start) : undefined
      attendance.value.end = todayData.end ? toJSTTimeString(todayData.end) : undefined
    }
  } catch (e) {
    console.error('勤務実績取得失敗', e)
  }
}

const todayStr = new Date().toISOString().slice(0, 10)
const todayRecord = computed(() =>
  records.value.find((r) => r.fullDate === todayStr)
)

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

<template>
  <div class="attendance-report">
    <div class="header">
      <Clock4 class="icon" />
      <h1 class="title">勤務報告</h1>
    </div>

    <div v-if="!uid" class="loading">ユーザー情報を取得中...</div>

    <div v-else>
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
        <AttendanceTab
          v-if="currentTab === '勤怠'"
          :uid="uid"
          :attendance="attendance"
          :todayRecord="todayRecord"
          :onUpdate="fetchRecords"
        />
        <ReportTab
          v-if="currentTab === '勤務実績'"
          :uid="uid"
          :year="year"
          :month="month"
          :records="records"
          @prevMonth="prevMonth"
          @nextMonth="nextMonth"
        />
      </div>
    </div>
  </div>
</template>

<style scoped>
.attendance-report {
  padding: 2rem 1rem;
  max-width: 900px;
  margin: 0 auto;
  font-family: 'Segoe UI', sans-serif;
}

/* タイトル */
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
  font-weight: 700;
  color: #1e3a8a;
}

/* タブ */
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
</style>
