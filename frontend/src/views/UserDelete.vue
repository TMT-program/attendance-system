<template>
  <div class="user-section">
    <h2 class="section-title">🗑️ ユーザー削除</h2>

    <table class="user-table">
      <thead>
        <tr>
          <th>名前</th>
          <th>メールアドレス</th>
          <th>管理者権限</th>
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="user in paginatedUsers"
          :key="user.uid"
          :class="{ selected: selectedUser?.uid === user.uid }"
          @click="selectUser(user)"
        >
          <td>{{ user.displayName || '(名前なし)' }}</td>
          <td>{{ user.email }}</td>
          <td>{{ user.isAdmin ? 'あり' : 'なし' }}</td>
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

    <div v-if="selectedUser" class="confirm-box">
      <button class="delete-button" @click="showConfirm = true">選択したユーザーを削除</button>
    </div>

    <p v-if="deleteMessage">{{ deleteMessage }}</p>

    <div v-if="showConfirm" class="modal-overlay">
      <div class="modal">
        <p>「{{ selectedUser?.displayName }}」を削除しますか？</p>
        <div class="modal-actions">
          <button class="delete-button" @click="deleteUser">削除</button>
          <button @click="showConfirm = false">キャンセル</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, defineProps, defineEmits } from 'vue'
import axios from 'axios'
import type { User } from '../components/types'

const props = defineProps<{
  users: User[]
}>()

const emit = defineEmits<{
  (e: 'go-back'): void
  (e: 'refresh-users'): void
}>()

const selectedUser = ref<User | null>(null)
const deleteMessage = ref('')
const showConfirm = ref(false)

const page = ref(1)
const pageSize = 10

const totalPages = computed(() => Math.max(1, Math.ceil(props.users.length / pageSize)))
const paginatedUsers = computed(() => {
  const start = (page.value - 1) * pageSize
  return props.users.slice(start, start + pageSize)
})

const prevPage = () => {
  if (page.value > 1) page.value--
}
const nextPage = () => {
  if (page.value < totalPages.value) page.value++
}

const selectUser = (user: User) => {
  selectedUser.value = user
}

const deleteUser = async () => {
  if (!selectedUser.value) return
  try {
    await axios.delete(`http://localhost:3000/api/users/${selectedUser.value.uid}`)
    deleteMessage.value = `${selectedUser.value.displayName} を削除しました`
    selectedUser.value = null
    showConfirm.value = false
    emit('refresh-users')
  } catch (error) {
    console.error('削除失敗:', error)
    deleteMessage.value = 'ユーザー削除に失敗しました'
    showConfirm.value = false
  }
}
</script>

<style scoped>
.user-section {
  text-align: center;
}
.section-title {
  font-size: 1.8rem;
  margin-bottom: 1.5rem;
}
.user-table {
  width: 100%;
  border-collapse: collapse;
  margin-bottom: 1rem;
  font-size: 0.95rem;
  text-align: left;
  box-shadow: 0 2px 8px rgb(0 0 0 / 0.1);
  border-radius: 8px;
  overflow: hidden;
}
.user-table thead {
  background-color: #f0f4ff;
}
.user-table th,
.user-table td {
  padding: 12px 16px;
  border-bottom: 1px solid #ddd;
}
.user-table tbody tr:hover {
  background-color: #f5faff;
  cursor: pointer;
}
.user-table tbody tr.selected {
  background-color: #fdecea;
  border-left: 4px solid #dc2626;
}
.no-data {
  text-align: center;
  color: #888;
  padding: 1rem 0;
}
.pagination {
  margin: 1rem 0;
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 1rem;
}
.pagination button {
  padding: 0.3rem 0.7rem;
  font-size: 1.1rem;
  border: 1px solid #1e3a8a;
  border-radius: 4px;
  background-color: white;
  color: #1e3a8a;
  cursor: pointer;
  transition: background-color 0.3s ease;
}
.pagination button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.pagination button:hover:not(:disabled) {
  background-color: #dbeafe;
}
.back-button {
  padding: 0.5rem 1.5rem;
  font-size: 1.1rem;
  background-color: #1e3a8a;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  margin-top: 1.5rem;
}
.back-button:hover {
  background-color: #3b82f6;
}
.delete-button {
  background-color: #dc2626;
  color: white;
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 1rem;
}
.delete-button:hover {
  background-color: #b91c1c;
}
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.3);
  display: flex;
  align-items: center;
  justify-content: center;
}
.modal {
  background: white;
  padding: 2rem;
  border-radius: 10px;
  text-align: center;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
}
.modal-actions {
  margin-top: 1rem;
  display: flex;
  justify-content: center;
  gap: 1rem;
}
</style>
