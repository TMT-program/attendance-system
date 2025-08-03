<!-- AttendanceReport.vue -->
<script setup lang="ts">
import { Clock4 } from 'lucide-vue-next'
import { ref, onMounted, computed } from 'vue'
import { onAuthStateChanged } from 'firebase/auth'
import { auth, db } from '../firebase'
import { doc, getDoc } from 'firebase/firestore'
import axios from 'axios'

import AttendanceTab from './AttendanceTab.vue'
import ReportTab from './ReportTab.vue'
import ConfirmUserList from './ConfirmUserList.vue'
import ConfirmReportTab from './ConfirmReportTab.vue'

type TabType = '勤怠' | '勤務実績' | '勤務実績確認'
const tabs = ref<TabType[]>(['勤怠', '勤務実績'])
const currentTab = ref<TabType>('勤怠')

const uid = ref<string | null>(null)
const attendance = ref<{ start?: string; end?: string }>({})
const isAdmin = ref(false)
const selectedUser = ref<any | null>(null)

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

const toJSTTimeString = (input: any): string => {
  if (typeof input === 'string' && /^\d{2}:\d{2}$/.test(input)) {
    return input
  }
  if (typeof input !== 'string' || !input.includes('T')) {
    return ''
  }
  const date = new Date(input)
  if (isNaN(date.getTime())) return ''
  date.setHours(date.getHours())
  return date.toTimeString().slice(0, 5)
}

const getCurrentDateString = (): string => {
  const now = new Date()
  now.setHours(now.getHours() + 9)
  return now.toISOString().slice(0, 10)
}

onMounted(() => {
  onAuthStateChanged(auth, async (user) => {
    if (user) {
      uid.value = user.uid

      const userDoc = await getDoc(doc(db, 'users', user.uid))
      if (userDoc.exists()) {
        isAdmin.value = !!userDoc.data().isAdmin
        if (isAdmin.value && !tabs.value.includes('勤務実績確認')) {
          tabs.value.push('勤務実績確認')
        }
      }

      fetchRecords()
    }
  })
})

const fetchRecords = async () => {
  if (!uid.value) return

  const daysInMonth = new Date(year.value, month.value, 0).getDate()

  try {
    const res = await axios.get('${API_BASE_URL}/api/attendance', {
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
        start: toJSTTimeString(data[fullDate]?.start),
        end: toJSTTimeString(data[fullDate]?.end),
      })
    }
    records.value = result

    const todayStr = getCurrentDateString()
    const todayData = data[todayStr]
    attendance.value = {
      start: toJSTTimeString(todayData?.start),
      end: toJSTTimeString(todayData?.end),
    }
  } catch (e) {
    console.error('勤務実績取得失敗', e)
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
          @click="() => { currentTab = tab; selectedUser = null }"
        >
          {{ tab }}
        </button>
      </div>

      <div class="tab-content">
        <AttendanceTab
          v-if="currentTab === '勤怠'"
          :uid="uid"
          :attendance="attendance"
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

        <ConfirmUserList
          v-if="currentTab === '勤務実績確認' && isAdmin && !selectedUser"
          @select-user="(user) => selectedUser = user"
        />

        <ConfirmReportTab
          v-if="currentTab === '勤務実績確認' && isAdmin && selectedUser"
          :user="selectedUser"
          @back="() => selectedUser = null"
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
