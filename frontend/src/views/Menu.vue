<template>
  <div class="menu-container">
    <h1 class="title">メニュー</h1>
    <div class="menu-grid">
      <button class="menu-card" @click="goToUserManagement">
        <User class="icon" />
        <span class="label">ユーザー管理</span>
      </button>
      <button class="menu-card" @click="goToAttendanceReport">
        <ClipboardEdit class="icon" />
        <span class="label">勤務報告</span>
      </button>
      <button class="menu-card" @click="goAnnouncements">
        <Megaphone class="icon" />
        <span class="label">周知事項</span>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'
import { User, ClipboardEdit, Megaphone } from 'lucide-vue-next'

const router = useRouter()

const goToUserManagement = () => {
  router.push({ name: 'UserManagement' })
}

const goToAttendanceReport = () => {
  router.push({ name: 'AttendanceReport' })
}

const goAnnouncements = () => {
  router.push({ name: 'Announcements' })
}
</script>

<style scoped>
.menu-container {
  padding: 2rem;
  max-width: 900px;
  margin: 0 auto;
  text-align: center;
  font-family: 'Segoe UI', sans-serif;
}

.title {
  font-size: 2.4rem;
  margin-bottom: 2rem;
  color: #1e3a8a; /* indigo-900 */
  font-weight: bold;
}

.menu-grid {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 2rem;
}

.menu-card {
  width: 260px;
  height: 160px;
  border: 2px solid #1e3a8a;
  border-radius: 12px;
  background-color: #f8fafc; /* slate-50 */
  color: #1e3a8a;
  font-size: 1.2rem;
  font-weight: bold;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  transition: all 0.3s ease;
  cursor: pointer;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.08);
}

.menu-card:hover {
  background-color: #e0f2fe; /* sky-100 */
  transform: translateY(-4px);
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.15);
}

.icon {
  width: 2.4rem;
  height: 2.4rem;
  margin-bottom: 0.5rem;
  color: #334155; /* slate-700 */
  transition: color 0.2s ease;
}

.menu-card:hover .icon {
  color: #dc2626; /* red-600 */
}

.label {
  font-size: 1.1rem;
}
</style>
