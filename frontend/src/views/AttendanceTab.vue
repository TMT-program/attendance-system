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

// JSTに変換して "HH:MM" 表示する関数
const toJSTTimeString = (iso: string) => {
  const date = new Date(iso)
  date.setHours(date.getHours()+9)
  return date.toTimeString().slice(0, 5)
}

const clockIn = async () => {
  const now = new Date()
  const iso = now.toISOString()
  props.attendance.start = toJSTTimeString(iso)
  try {
    await axios.post(`http://localhost:3000/api/attendance/start`, {
      uid: props.uid,
      time: iso,
    })
    props.onUpdate()
  } catch (e) {
    console.error('出勤登録失敗', e)
  }
}

const clockOut = async () => {
  const now = new Date()
  const iso = now.toISOString()
  props.attendance.end = toJSTTimeString(iso)
  try {
    await axios.post(`http://localhost:3000/api/attendance/end`, {
      uid: props.uid,
      time: iso,
    })
    props.onUpdate()
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
