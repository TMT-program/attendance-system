<template>
  <div class="attendance-report">
    <div class="header">
      <Clock4 class="icon" />
      <h1 class="title">勤務報告</h1>
    </div>

    <div v-if="!uid" class="loading">ユーザー情報を取得中...</div>

    <div v-else>
      <div class="tab-menu" role="tablist" aria-label="勤務報告タブ">
        <button
          v-for="tab in tabs"
          :key="tab"
          type="button"
          :class="['tab-button', { active: currentTab === tab }]"
          role="tab"
          :aria-selected="currentTab === tab"
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
          :username="username"
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

<script setup lang="ts">
import { Clock4 } from 'lucide-vue-next'
import { ref, onMounted } from 'vue'
import { onAuthStateChanged } from 'firebase/auth'
import { auth, db } from '../firebase'
import { doc, getDoc } from 'firebase/firestore'
import axios from 'axios'

import AttendanceTab from './AttendanceTab.vue'
import ReportTab from './ReportTab.vue'
import ConfirmUserList from './ConfirmUserList.vue'
import ConfirmReportTab from './ConfirmReportTab.vue'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL

type TabType = '勤怠' | '勤務実績' | '勤務実績確認'
const tabs = ref<TabType[]>(['勤怠', '勤務実績'])
const currentTab = ref<TabType>('勤怠')

const uid = ref<string | null>(null)
const username = ref<string>('') // ← 追加：ログイン中ユーザー名表示用
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

type AttendanceRecord = {
  start?: string
  end?: string
  task?: string
  status?: string
}

type AttendanceResponse = Record<string, AttendanceRecord>

const records = ref<RecordEntry[]>([])

const toJSTTimeString = (input: any): string => {
  if (typeof input === 'string' && /^\d{2}:\d{2}$/.test(input)) return input
  if (typeof input !== 'string' || !input.includes('T')) return ''
  const date = new Date(input)
  if (isNaN(date.getTime())) return ''
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
      username.value = user.displayName || user.email || '' // ← 取得して保持
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
    const res = await axios.get<AttendanceResponse>(`${API_BASE_URL}/api/attendance`, {
      params: {
        uid: uid.value,
        year: year.value,
        month: String(month.value).padStart(2, '0'),
      },
    })

    const data = res.data ?? {}

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

<style scoped>
.attendance-report {
  padding: 2rem 1rem;
  max-width: 960px;
  width: 100%;
  margin: 0 auto;
  box-sizing: border-box;
  -webkit-font-smoothing: antialiased;
  text-rendering: optimizeLegibility;
  color: #0f172a;
}

.header {
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 1rem;
  gap: 0.6rem;
}

.icon {
  width: 28px;
  height: 28px;
  color: #0f172a;
}

.title {
  font-size: 1.9rem;
  font-weight: 800;
  color: #0f172a;
  white-space: nowrap;
}

.loading {
  text-align: center;
  color: #475569;
  font-weight: 700;
  padding: 1rem 0;
}

/* タブUI（PC） */
.tab-menu {
  display: flex;
  justify-content: center;
  border-bottom: 1px solid #cbd5e1;
  margin-bottom: 1rem;
  gap: 0.5rem;
}

.tab-button {
  background: #ffffff;
  border: 1px solid #cbd5e1;
  padding: 0.55rem 1rem;
  font-size: 0.95rem;
  font-weight: 700;
  cursor: pointer;
  color: #0f172a;
  border-radius: 10px 10px 0 0;
  white-space: nowrap;
}

.tab-button.active {
  background: #edf2ff;
  border-bottom-color: #edf2ff;
}

.tab-content {
  min-height: 300px;
}

/* スマホ */
@media (max-width: 600px) {
  .attendance-report {
    padding: 1rem 0.5rem; /* transformで縮めない */
  }

  .icon {
    width: 22px;
    height: 22px;
  }

  .title {
    font-size: 1.5rem;
    white-space: normal;
    text-align: center;
  }

  /* ✅ ここが肝：タブを画面幅に収める */
  .tab-menu {
    justify-content: space-between;
    gap: 0.35rem;
    margin-bottom: 0.6rem;
  }

  .tab-button {
    flex: 1;          /* 画面幅に合わせて縮む */
    min-width: 0;     /* 長い文字があっても縮む */
    padding: 0.5rem 0.4rem;
    font-size: 0.85rem;
    text-align: center;

    /* 収まらない場合は省略表示（PCはそのまま） */
    overflow: hidden;
    text-overflow: ellipsis;
  }
}
</style>
