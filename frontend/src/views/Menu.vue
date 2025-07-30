<template>
  <div class="menu-container">
    <h1 class="title">メニュー</h1>
    <div class="menu-grid">
      <button class="menu-card" @click="goToUserManagement">
        <span class="icon">👤</span>
        <span class="label">ユーザー管理</span>
      </button>
      <button class="menu-card" @click="goToAttendanceReport">
        <span class="icon">📝</span>
        <span class="label">勤務報告</span>
      </button>
      <button class="menu-card" @click="goAnnouncements">
        <span class="icon">📢</span>
        <span class="label">周知事項</span>
      </button>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { useRouter } from 'vue-router'

const router = useRouter()

function goToUserManagement() {
  router.push({ name: 'UserManagement' })
}
function goToAttendanceReport() {
  router.push({ name: 'AttendanceReport' })
}
function goAnnouncements() {
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
  color: #1e3a8a;
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
  background-color: #f0f8ff;
  color: #1e3a8a;
  font-size: 1.2rem;
  font-weight: bold;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  transition: all 0.3s ease;
  cursor: pointer;
}

.menu-card:hover {
  background-color: #dbeafe;
  transform: translateY(-4px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.icon {
  font-size: 2.5rem;
  margin-bottom: 0.5rem;
}

.label {
  font-size: 1.1rem;
}
</style>
