<template>
  <div class="user-section">
    <div class="responsive-wrapper">
      <h2 class="section-title">📋 ユーザー一覧</h2>

      <div class="search-box">
        <input
          type="text"
          v-model="searchKeyword"
          placeholder="検索ワードを入力"
          aria-label="ユーザー検索"
        />
        <button @click="searchUsers" aria-label="検索">検索</button>
      </div>
    </div>

    <template v-if="isLoading">
      <LoadingSpinner />
    </template>

    <template v-else>
      <div class="table-wrapper">
        <table class="user-table" role="table" aria-label="ユーザー一覧テーブル">
          <thead>
            <tr>
              <th scope="col">名前</th>
              <th scope="col">メールアドレス</th>
              <th scope="col" class="col-admin">管理者権限</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="user in paginatedUsers" :key="user.uid">
              <td :title="user.displayName || '(名前なし)'">
                {{ user.displayName || '(名前なし)' }}
              </td>
              <td :title="user.email">{{ user.email }}</td>
              <td class="col-admin">
                <label class="check-wrap" :aria-label="`管理者権限: ${user.displayName || user.email}`">
                  <input
                    type="checkbox"
                    :checked="user.isAdmin"
                    @change="toggleAdmin(user, $event)"
                  />
                  <span class="check-label">{{ user.isAdmin ? 'ON' : 'OFF' }}</span>
                </label>
              </td>
            </tr>
            <tr v-if="paginatedUsers.length === 0">
              <td colspan="3" class="no-data">該当するユーザーがいません</td>
            </tr>
          </tbody>
        </table>

        <div class="responsive-wrapper">
          <div class="pagination">
            <button @click="prevPage" :disabled="page === 1" aria-label="前のページ">←</button>
            <span aria-live="polite">{{ page }} / {{ totalPages }}</span>
            <button @click="nextPage" :disabled="page === totalPages" aria-label="次のページ">→</button>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, defineProps, defineEmits, onMounted } from 'vue'
import axios from 'axios'
import LoadingSpinner from '../components/LoadingSpinner.vue'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL
const IS_DEMO = import.meta.env.VITE_DEMO_FLAG === 'true'

// デモモードで権限変更を禁止する UID
const DEMO_PROTECTED_UIDS = [
  '5fvxqbgf4nPN1k1gR1vp2seFzOr1', // 管理者
  'Mc7myNRJ0HV5jmBh3yRgCwGtkHk2'  // 一般
]

interface User {
  uid: string
  email: string
  displayName: string
  isAdmin: boolean
}

const props = defineProps<{ users: User[] }>()
const emit = defineEmits(['refreshUsers', 'goBack'])

const searchKeyword = ref('')
const page = ref(1)
const pageSize = 10
const isLoading = ref(false)

const filteredUsers = computed(() =>
  props.users.filter(user =>
    (user.displayName || '').toLowerCase().includes(searchKeyword.value.toLowerCase()) ||
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

onMounted(() => {
  isLoading.value = true
  setTimeout(() => {
    isLoading.value = false
  }, 300)
})

const toggleAdmin = async (user: User, event: Event) => {
  const isChecked = (event.target as HTMLInputElement).checked

  // デモモードかつ保護対象 UID の場合はキャンセル
  if (IS_DEMO && DEMO_PROTECTED_UIDS.includes(user.uid)) {
    alert('このユーザーの管理者権限は変更できません(デモ用動作)')
    ;(event.target as HTMLInputElement).checked = user.isAdmin // 元の状態に戻す
    return
  }

  isLoading.value = true
  try {
    await axios.patch(`${API_BASE_URL}/api/users/${user.uid}/role`, {
      isAdmin: isChecked
    })
    user.isAdmin = isChecked
    emit('refreshUsers')
  } catch (error) {
    console.error('管理者権限変更失敗:', error)
    ;(event.target as HTMLInputElement).checked = !isChecked
  } finally {
    isLoading.value = false
  }
}
</script>

<style scoped>
.user-section {
  background-color: #f8fafc;
  padding: 1rem;
  border-radius: 10px;
  max-width: 100%;
  -webkit-font-smoothing: antialiased;
  text-rendering: optimizeLegibility;
}

.responsive-wrapper {
  transition: transform 0.2s ease;
}

.section-title {
  font-size: 1.9rem;
  margin-bottom: 1rem;
  color: #0f172a;
  text-align: center;
  white-space: nowrap;
  font-weight: 700;
}

.search-box {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-bottom: 0.75rem;
  justify-content: center;
}

.search-box input {
  padding: 0.6rem 0.75rem;
  min-width: 220px;
  max-width: 360px;
  width: 100%;
  box-sizing: border-box;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  outline: none;
}

.search-box input:focus {
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.15);
}

.search-box button {
  padding: 0.6rem 1rem;
  background-color: #1e3a8a;
  color: white;
  border: 1px solid #1e3a8a;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 600;
}

.search-box button:hover {
  filter: brightness(1.05);
}

.table-wrapper {
  width: 100%;
  overflow: auto;
  border: 1px solid #cbd5e1;
  border-radius: 10px;
  background: #ffffff;
  box-shadow:
    0 1px 1px rgba(15, 23, 42, 0.04),
    0 4px 12px rgba(15, 23, 42, 0.06);
}

.user-table {
  width: 100%;
  border-collapse: separate;
  border-spacing: 0;
  font-size: 0.95rem;
  color: #0f172a;
}

.user-table thead th {
  position: sticky;
  top: 0;
  z-index: 1;
  background: #edf2ff;
  text-align: left;
  font-weight: 700;
  padding: 12px 14px;
  border-bottom: 2px solid #94a3b8;
  border-right: 1px solid #e2e8f0; /* 縦線 */
  white-space: nowrap;
}

.user-table thead th:last-child {
  border-right: none;
}

.user-table th,
.user-table td {
  padding: 12px 14px;
  border-bottom: 1px solid #e2e8f0;
  border-right: 1px solid #e2e8f0; /* 縦線追加 */
  text-align: left; /* 左寄せ */
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.user-table th:last-child,
.user-table td:last-child {
  border-right: none;
}

.user-table tbody tr:nth-child(odd) {
  background: #f8fafc;
}
.user-table tbody tr:hover {
  background: #e8f0ff;
}

.user-table td:nth-child(1) { min-width: 160px; }
.user-table td:nth-child(2) { min-width: 220px; }
.user-table .col-admin { min-width: 140px; text-align: left; }

.check-wrap {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
}
.check-wrap input {
  width: 18px;
  height: 18px;
  accent-color: #2563eb;
  cursor: pointer;
}
.check-wrap .check-label {
  font-weight: 600;
  color: #334155;
}

.no-data {
  text-align: center;
  color: #64748b;
  padding: 18px 0;
  font-weight: 600;
}

.pagination {
  margin: 0.75rem 0;
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 1rem;
}
.pagination button {
  min-width: 2.2rem;
  min-height: 2.2rem;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  background: #ffffff;
  cursor: pointer;
}
.pagination button:enabled:hover {
  background: #f1f5f9;
}
.pagination button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.pagination span {
  font-weight: 700;
  letter-spacing: 0.02em;
}

@media (max-width: 600px) {
  .user-table,
  .responsive-wrapper {
    transform: scale(0.7);
    transform-origin: top left;
  }
  .user-table { margin-top: 0.01rem; }
  .section-title {
    font-size: 1.4rem;
    margin-bottom: 0.5rem;
  }
  .search-box {
    flex-direction: column;
    align-items: center;
    margin-bottom: 0.5rem;
  }
  .pagination {
    margin: 0.2rem 0;
  }
  .pagination span {
    font-size: 1.6rem;
  }
  .user-table th,
  .user-table td {
    padding: 10px 12px;
  }
}
</style>
