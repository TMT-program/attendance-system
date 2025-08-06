<template>
  <div class="user-section">
    <div v-if="isLoading">
      <LoadingSpinner />
    </div>

    <div v-else>
      <div class="table-wrapper">
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
  </div>
</template>

<script setup lang="ts">
import { ref, computed, defineProps, defineEmits } from 'vue'
import axios from 'axios'
import type { User } from '../components/types'
import LoadingSpinner from '../components/LoadingSpinner.vue'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL

const props = defineProps<{ users: User[] }>()
const emit = defineEmits<{
  (e: 'go-back'): void
  (e: 'refresh-users'): void
}>()

const selectedUser = ref<User | null>(null)
const deleteMessage = ref('')
const showConfirm = ref(false)
const isLoading = ref(false)

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
  isLoading.value = true
  try {
    await axios.delete(`${API_BASE_URL}/api/users/${selectedUser.value.uid}`)
    deleteMessage.value = `${selectedUser.value.displayName} を削除しました`
    selectedUser.value = null
    showConfirm.value = false
    emit('refresh-users')
  } catch (error) {
    console.error('削除失敗:', error)
    deleteMessage.value = 'ユーザー削除に失敗しました'
    showConfirm.value = false
  } finally {
    isLoading.value = false
  }
}
</script>

<style scoped>
.user-section {
  text-align: center;
  padding: 1rem;
}

.section-title {
  font-size: 1.8rem;
  margin: 1rem auto 1.5rem auto;
  color: #1e3a8a;
  text-align: center;
  width: fit-content;
}

.table-wrapper {
  overflow-x: auto;
  margin: 0 auto;
  max-width: 100%;
  text-align: center;
}

.user-table {
  width: 100%;
  border-collapse: collapse;
  margin-top: 1rem;
  margin-bottom: 0.5rem;
  font-size: 0.95rem;
  text-align: left;
  box-shadow: 0 2px 8px rgb(0 0 0 / 0.1);
  border-radius: 8px;
  overflow: hidden;
  min-width: 480px;
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
  margin: 0.8rem 0;
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
  z-index: 1000;
}

.modal {
  background: white;
  padding: 2rem;
  border-radius: 10px;
  text-align: center;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
  max-width: 90%;
}

.modal-actions {
  margin-top: 1rem;
  display: flex;
  justify-content: center;
  gap: 1rem;
}

/* スマホ用調整 */
@media (max-width: 600px) {
  .table-wrapper,
  .user-table {
    transform: scale(0.8);
    transform-origin: top left;
  }

  .section-title {
    font-size: 1.4rem;
    margin-bottom: 0.5rem;
  }

  .user-table {
    margin-top: 0.01rem;
  }

  .user-table th,
  .user-table td {
    padding: 8px;
  }

  .pagination {
    margin: 0.2rem 0;
  }

  .pagination span {
    font-size: 1.5rem;
  }

  @media (max-width: 600px) {
  .section-title {
    font-size: 1.4rem;
    margin-bottom: 0.5rem;
    text-align: center;         /* ← 追加！ */
    padding-left: -40.0rem;  
  }
}

@media (max-width: 600px) {
  .pagination {
    margin: 0.2rem 0;
    justify-content: flex-start; /* ← 中央 → 左寄せに変更！ */
    padding-left: 5.0rem;        /* ← 左寄せ時の余白調整（任意） */
  }
}

  .delete-button {
    font-size: 0.9rem;
  }

  .modal {
    padding: 1.2rem;
    font-size: 0.95rem;
  }

  .modal-actions button {
    font-size: 0.9rem;
  }
}
</style>
