<template>
  <div>
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
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import axios from 'axios'

const props = defineProps<{ uid: string }>()

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

// JST変換関数（HH:MM）
const toJSTTime = (utc: string): string => {
  const date = new Date(utc)
  date.setHours(date.getHours() + 24)
  return date.toTimeString().slice(0, 5)
}

const fetchRecords = async () => {
  const daysInMonth = new Date(year.value, month.value, 0).getDate()
  try {
    const res = await axios.get(`http://localhost:3000/api/attendance`, {
      params: {
        uid: props.uid,
        year: year.value,
        month: String(month.value).padStart(2, '0'),
      },
    })
    const data = res.data || {}
    const result: RecordEntry[] = []

    for (let d = 1; d <= daysInMonth; d++) {
      // UTCのまま、JST補正はしない
      const dateObj = new Date(Date.UTC(year.value, month.value - 1, d))
      const full = dateObj.toISOString().slice(0, 10)

      const dayIndex = dateObj.getUTCDay() // UTCベース
      const dayNames = ['日', '月', '火', '水', '木', '金', '土']

      result.push({
        date: `${month.value}/${d}`,
        fullDate: full,
        day: dayNames[dayIndex],
        dayIndex,
        start: data[full]?.start ? toJSTTime(data[full].start) : undefined,
        end: data[full]?.end ? toJSTTime(data[full].end) : undefined,
      })
    }
    records.value = result
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
</script>

<style scoped>
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
.record-table tr.holiday {
  background-color: #ffecec;
}
</style>
