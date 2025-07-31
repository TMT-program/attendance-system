<template>
  <header class="app-header">
    <div class="title">📘 勤怠システム</div>
    <div class="user-section" v-if="user">
      <span class="username">{{ user.displayName || user.email }}</span>
      <button @click="logout">ログアウト</button>
    </div>
  </header>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { auth } from '../firebase'
import { onAuthStateChanged, signOut, User } from 'firebase/auth'

const user = ref<User | null>(null)
const router = useRouter()

onMounted(() => {
  onAuthStateChanged(auth, (u) => {
    user.value = u
  })
})

const logout = async () => {
  await signOut(auth)
  router.push('/')
}
</script>

<style scoped>
.app-header {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 64px; /* 高さを明示 */
  z-index: 1000;
  display: flex;
  justify-content: space-between;
  align-items: center;
  background-color: #fef2f2;
  border-bottom: 2px solid #dc2626;
  padding: 0 1.5rem;
  box-sizing: border-box; /* ← paddingで高さがはみ出ないように */
}

.title {
  font-size: 1.4rem;
  font-weight: bold;
  color: #dc2626;
}

.user-section {
  display: flex;
  align-items: center;
}

.username {
  margin-right: 1rem; /* ここで間隔を空ける */
  font-weight: 600;
  color: #1e3a8a;
}

.user-section button {
  background-color: #dc2626;
  color: white;
  border: none;
  padding: 0.4rem 0.8rem;
  font-size: 0.9rem;
  height: 36px;            /* ← 高さを制限 */
  line-height: 1.2;
  border-radius: 4px;
  cursor: pointer;
  transition: background-color 0.2s ease;
}

.user-section button:hover {
  background-color: #b91c1c;
}
</style>
