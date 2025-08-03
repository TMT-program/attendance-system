<template>
  <div class="tab-panel">
    <div class="actions">
      <button @click="clockIn" :disabled="!!attendance.start">出勤</button>
      <button @click="clockOut" :disabled="!attendance.start || !!attendance.end">退勤</button>
    </div>
    <div v-if="attendance.start" class="record">✅ {{ attendance.start }} に出勤しました</div>
    <div v-if="attendance.end" class="record">✅ {{ attendance.end }} に退勤しました</div>
  </div>
</template>

<script setup lang="ts">
import axios from 'axios'

const props = defineProps<{
  uid: string
  attendance: { start?: string; end?: string }
  onUpdate: () => void
}>()

// 現在時刻を "HH:MM" 形式で返す関数
const getCurrentTimeString = () => {
  const now = new Date()
  const hours = String(now.getHours()).padStart(2, '0')
  const minutes = String(now.getMinutes()).padStart(2, '0')
  return `${hours}:${minutes}`
}

// 現在日付（JST）を "YYYY-MM-DD" 形式で返す関数
const getCurrentDateString = () => {
  const now = new Date()
  now.setHours(now.getHours() + 9) // JST補正
  return now.toISOString().slice(0, 10)
}

const clockIn = async () => {
  const time = getCurrentTimeString()
  const date = getCurrentDateString()
  try {
    await axios.post(`http://localhost:3000/api/attendance/report`, {
      uid: props.uid,
      date,
      start: time,
      task: '-',
      status: '未承認'
    })
    props.onUpdate() // ← propsは直接変更せず親に任せる
  } catch (e) {
    console.error('出勤登録失敗', e)
  }
}

const clockOut = async () => {
  const time = getCurrentTimeString()
  const date = getCurrentDateString()
  try {
    await axios.post(`http://localhost:3000/api/attendance/report`, {
      uid: props.uid,
      date,
      end: time,
      task: '-',
      status: '未承認'
    })
    props.onUpdate() // ← propsは直接変更せず親に任せる
  } catch (e) {
    console.error('退勤登録失敗', e)
  }
}
</script>

<style scoped>
.tab-panel {
  animation: fadeIn 0.3s ease-in-out;
}
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
}

.actions {
  display: flex;
  flex-direction: row;
  justify-content: center;
  gap: 1.5rem;
  margin-bottom: 1rem;
}
.actions button {
  padding: 0.7rem 2rem;
  font-size: 1rem;
  background-color: #1e40af;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  transition: background-color 0.2s;
}
.actions button:disabled {
  background-color: #9ca3af;
  cursor: not-allowed;
}
.record {
  text-align: center;
  font-weight: bold;
  color: #065f46;
}
</style>
