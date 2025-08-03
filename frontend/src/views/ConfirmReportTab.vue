<template>
  <div class="confirm-report-tab">
    <h3>{{ user.displayName }} さんの勤務実績</h3>

    <div class="month-nav">
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
            <button v-if="entry.status === '承認待'" @click="approve(entry)">承認</button>
            <span v-else>-</span>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import axios from 'axios'

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

const fetchRecords = async () => {
  try {
    const res = await axios.get('http://localhost:3000/api/attendance', {
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
  console.log('承認クリック: ', entry.fullDate)
  // 将来的なFirestore更新処理をここに実装予定
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
  margin-top: 2rem;
}
.month-nav {
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
  border: 1px solid #ccc;
  padding: 0.5rem;
  text-align: center;
}
.status-approved {
  background-color: #d9f99d;
}
.status-pending {
  background-color: #fff9c4;
}
</style>
