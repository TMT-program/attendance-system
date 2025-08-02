<template>
  <div class="user-section">
    <h2 class="section-title">📋 ユーザー一覧</h2>
    <div class="search-box">
      <input type="text" v-model="searchKeyword" placeholder="検索ワードを入力" />
      <button @click="searchUsers">検索</button>
    </div>
    <table class="user-table">
      <thead>
        <tr>
          <th>名前</th>
          <th>メールアドレス</th>
          <th>管理者権限</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="user in paginatedUsers" :key="user.uid">
          <td>{{ user.displayName || '(名前なし)' }}</td>
          <td>{{ user.email }}</td>
          <td>
            <input type="checkbox" :checked="user.isAdmin" @change="toggleAdmin(user, $event)" />
          </td>
        </tr>
        <tr v-if="paginatedUsers.length === 0">
          <td colspan="3" class="no-data">該当するユーザーがいません</td>
        </tr>
      </tbody>
    </table>
    <div class="pagination">
      <button @click="prevPage" :disabled="page === 1">←</button>
      <span>{{ page }} / {{ totalPages }}</span>
      <button @click="nextPage" :disabled="page === totalPages">→</button>
    </div>
    <button class="back-button" @click="$emit('goBack')">← メニューに戻る</button>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, defineProps, defineEmits } from 'vue'
import axios from 'axios'

interface User {
  uid: string
  email: string
  displayName: string
  isAdmin: boolean
}

const props = defineProps<{
  users: User[]
}>()

const emit = defineEmits(['refreshUsers', 'goBack'])

const searchKeyword = ref('')
const page = ref(1)
const pageSize = 10

const filteredUsers = computed(() =>
  props.users.filter(user =>
    user.displayName.toLowerCase().includes(searchKeyword.value.toLowerCase()) ||
    user.email.toLowerCase().includes(searchKeyword.value.toLowerCase())
  )
)

const paginatedUsers = computed(() => {
  const start = (page.value - 1) * pageSize
  return filteredUsers.value.slice(start, start + pageSize)
})

const totalPages = computed(() =>
  Math.max(1, Math.ceil(filteredUsers.value.length / pageSize))
)

const prevPage = () => {
  if (page.value > 1) page.value--
}

const nextPage = () => {
  if (page.value < totalPages.value) page.value++
}

const searchUsers = () => {
  page.value = 1
}

const toggleAdmin = async (user: User, event: Event) => {
  const isChecked = (event.target as HTMLInputElement).checked
  try {
    await axios.patch(`http://localhost:3000/api/users/${user.uid}/role`, {
      isAdmin: isChecked
    })
    user.isAdmin = isChecked
    emit('refreshUsers')
  } catch (error) {
    console.error('管理者権限変更失敗:', error)
    ;(event.target as HTMLInputElement).checked = !isChecked
  }
}
</script>

<style scoped>
.user-section {
  background-color: #f8fafc;
  padding: 1rem;
  border-radius: 8px;
}
.section-title {
  font-size: 1.8rem;
  margin-bottom: 1.5rem;
  color: #1e3a8a;
}
.search-box input {
  padding: 0.5rem;
  width: 220px;
  margin-right: 0.5rem;
  border: 1px solid #ccc;
  border-radius: 4px;
}
.search-box button {
  padding: 0.5rem 1rem;
  background-color: #1e3a8a;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
}
.user-table {
  width: 100%;
  border-collapse: collapse;
  margin-top: 1rem;
}
.user-table th, .user-table td {
  padding: 12px;
  border-bottom: 1px solid #ccc;
  text-align: left;
}
.user-table thead {
  background-color: #f0f4ff;
}
.pagination {
  margin: 1rem 0;
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 1rem;
}
.back-button {
  background-color: #1e3a8a;
  color: white;
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 6px;
  margin-top: 1rem;
  cursor: pointer;
}
.back-button:hover {
  background-color: #3b82f6;
}
</style>
