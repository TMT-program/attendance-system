<template>
  <div class="confirm-user-list">
    <h2 class="section-title">ユーザー一覧</h2>

    <div class="responsive-wrapper">
      <table class="user-table">
        <thead>
          <tr>
            <th>ユーザー名</th>
            <th>メールアドレス</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="user in paginatedUsers" :key="user.uid">
            <td>{{ user.displayName || '-' }}</td>
            <td>{{ user.email }}</td>
            <td>
              <button class="submit-button" @click="selectUser(user)">確認</button>
            </td>
          </tr>
        </tbody>
      </table>

      <div class="pagination">
        <button @click="prevPage" :disabled="currentPage === 1">←</button>
        <span>Page {{ currentPage }} / {{ totalPages }}</span>
        <button @click="nextPage" :disabled="currentPage === totalPages">→</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { collection, getDocs } from 'firebase/firestore'
import { db } from '../firebase'

interface UserInfo {
  uid: string
  displayName: string
  email: string
}

const emit = defineEmits<{
  (e: 'select-user', user: UserInfo): void
}>()

const users = ref<UserInfo[]>([])
const currentPage = ref(1)
const usersPerPage = 10

const fetchUsers = async () => {
  const snapshot = await getDocs(collection(db, 'users'))
  users.value = snapshot.docs.map(doc => ({
    uid: doc.id,
    displayName: doc.data().displayName || '',
    email: doc.data().email || '',
  }))
}

const totalPages = computed(() =>
  Math.ceil(users.value.length / usersPerPage)
)

const paginatedUsers = computed(() => {
  const start = (currentPage.value - 1) * usersPerPage
  return users.value.slice(start, start + usersPerPage)
})

const nextPage = () => {
  if (currentPage.value < totalPages.value) currentPage.value++
}
const prevPage = () => {
  if (currentPage.value > 1) currentPage.value--
}

const selectUser = (user: UserInfo) => {
  emit('select-user', user)
}

onMounted(fetchUsers)
</script>

<style scoped>
.confirm-user-list {
  max-width: 900px;
  margin: 0 auto;
  padding: 1rem;
  text-align: center;
}

.section-title {
  font-size: 1.6rem;
  margin-bottom: 1.2rem;
  font-weight: bold;
  color: #1e3a8a;
}

.responsive-wrapper {
  overflow-x: auto;
}

.user-table {
  width: 100%;
  border-collapse: collapse;
  margin-bottom: 1rem;
  font-size: 0.95rem;
  min-width: 480px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  border-radius: 8px;
  overflow: hidden;
}

.user-table th,
.user-table td {
  border: 1px solid #ccc;
  padding: 0.5rem 1rem;
  text-align: left;
  white-space: nowrap; /* 折り返さない */
}

.pagination {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 1rem;
  margin: 1rem 0;
  font-size: 0.95rem;
}

button {
  padding: 0.4rem 1rem;
  font-size: 0.9rem;
}

/* 勤務実績タブの提出ボタン風のスタイルを統一 */
.submit-button {
  background-color: #2563eb;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}
.submit-button:hover {
  background-color: #1e40af;
}

/* スマホ画面向け縮小表示 */
@media (max-width: 600px) {
  .responsive-wrapper {
    transform: scale(0.7);
    transform-origin: top left;
  }

  .user-table {
    margin-top: 0.01rem;
  }

  .pagination {
    margin: 0.2rem 0;
  }

  .user-table th,
  .user-table td {
    padding: 0.2rem 0.4rem;
    font-size: 0.75rem;
  }

  .submit-button {
    font-size: 0.75rem;
    padding: 0.3rem 0.6rem;
  }

  .section-title {
    font-size: 1.3rem;
    margin-bottom: 1rem;
  }
}
</style>
