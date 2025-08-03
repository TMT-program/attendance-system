<template>
  <div class="confirm-user-list">
    <h2>ユーザー一覧</h2>

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
          <td><button @click="selectUser(user)">確認</button></td>
        </tr>
      </tbody>
    </table>

    <div class="pagination">
      <button @click="prevPage" :disabled="currentPage === 1">←</button>
      <span>Page {{ currentPage }} / {{ totalPages }}</span>
      <button @click="nextPage" :disabled="currentPage === totalPages">→</button>
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
  max-width: 800px;
  margin: 0 auto;
}
.user-table {
  width: 100%;
  border-collapse: collapse;
  margin-bottom: 1rem;
}
.user-table th,
.user-table td {
  border: 1px solid #ccc;
  padding: 0.5rem;
  text-align: left;
}
.pagination {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 1rem;
  margin-bottom: 2rem;
}
button {
  padding: 0.4rem 1rem;
  font-size: 0.9rem;
}
</style>
