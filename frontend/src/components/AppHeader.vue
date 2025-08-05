<template>
  <header class="app-header">
    <div class="left-section">
      <button v-if="showBackButton" @click="props.onBack ? props.onBack() : goBack()" class="back-button">← 戻る</button>
      <div class="title">
        <BadgeCheck class="icon" /> 勤怠管理システム
      </div>
    </div>
    <div class="user-section" v-if="user">
      <span class="username">
        {{ user.displayName || user.email }}
        <template v-if="isAdmin">（管理者）</template>
      </span>
      <button @click="logout">ログアウト</button>
    </div>
  </header>
</template>

<script setup lang="ts">
import { BadgeCheck } from 'lucide-vue-next'
import { ref, onMounted, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { auth } from '../firebase'
import { onAuthStateChanged, signOut, User } from 'firebase/auth'
import { doc, getDoc, getFirestore } from 'firebase/firestore'

const props = defineProps<{ onBack?: () => void }>()
const router = useRouter()
const route = useRoute()

const user = ref<User | null>(null)
const isAdmin = ref<boolean>(false)

const db = getFirestore()

onMounted(() => {
  onAuthStateChanged(auth, async (u) => {
    user.value = u
    if (u) {
      const userDoc = await getDoc(doc(db, 'users', u.uid))
      if (userDoc.exists()) {
        const data = userDoc.data()
        isAdmin.value = data.isAdmin === true
      }
    }
  })
})

const logout = async () => {
  await signOut(auth)
  router.push('/')
}

const showBackButton = computed(() => route.path !== '/menu')

const goBack = () => {
  router.back()
}
</script>

<style scoped>
.app-header {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 64px;
  z-index: 1000;
  display: flex;
  justify-content: space-between;
  align-items: center;
  background-color: #fef2f2;
  border-bottom: 2px solid #dc2626;
  padding: 0 1.5rem;
  box-sizing: border-box;
  overflow: hidden; /* はみ出し防止 */
}

.left-section {
  display: flex;
  align-items: center;
}

.back-button {
  background: none;
  border: none;
  font-size: 1rem;
  color: #dc2626;
  cursor: pointer;
  margin-right: 1rem;
  padding: 0;
  outline: none;
}

.back-button:hover {
  text-decoration: underline;
}

.title {
  font-size: 1.4rem;
  font-weight: bold;
  color: #dc2626;
  display: flex;
  align-items: center;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.title .icon {
  width: 1.5rem;
  height: 1.5rem;
  margin-right: 0.4rem;
}

.user-section {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  max-width: 50%;
}

.username {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  font-weight: 600;
  color: #1e3a8a;
  max-width: 140px;
}

.user-section button {
  background-color: #dc2626;
  color: white;
  border: none;
  padding: 0.4rem 0.8rem;
  font-size: 0.9rem;
  height: 36px;
  line-height: 1.2;
  border-radius: 4px;
  cursor: pointer;
  transition: background-color 0.2s ease;
  white-space: nowrap;
}

.user-section button:hover {
  background-color: #b91c1c;
}

/* スマホ対応 */
@media (max-width: 600px) {
  .title {
    font-size: 1.1rem;
  }

  .username {
    font-size: 0.8rem;
    max-width: 100px;
  }

  .user-section button {
    font-size: 0.75rem;
    padding: 0.3rem 0.6rem;
  }
}
</style>
