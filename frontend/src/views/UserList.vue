<template>
  <div class="user-section">
    <div class="responsive-wrapper">
      <h2 class="section-title">📋 ユーザー一覧</h2>

      <div class="search-box">
        <input type="text" v-model="searchKeyword" placeholder="検索ワードを入力" />
        <button @click="searchUsers">検索</button>
      </div>
    </div>

    <template v-if="isLoading">
      <LoadingSpinner />
    </template>

    <template v-else>
      <div class="table-wrapper">
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
                <input
                  type="checkbox"
                  :checked="user.isAdmin"
                  @change="toggleAdmin(user, $event)"
                />
              </td>
            </tr>
            <tr v-if="paginatedUsers.length === 0">
              <td colspan="3" class="no-data">該当するユーザーがいません</td>
            </tr>
          </tbody>
        </table>

        <div class="responsive-wrapper">
          <div class="pagination">
            <button @click="prevPage" :disabled="page === 1">←</button>
            <span>{{ page }} / {{ totalPages }}</span>
            <button @click="nextPage" :disabled="page === totalPages">→</button>
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
  border-radius: 8px;
  overflow-x: auto;
  max-width: 100%;
}

.responsive-wrapper {
  transition: transform 0.2s ease;
}

.section-title {
  font-size: 1.8rem;
  margin-bottom: 1.5rem;
  color: #1e3a8a;
  text-align: center;
  white-space: nowrap;
}

.search-box {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
  justify-content: center;
}

.search-box input,
.search-box button {
  padding: 0.5rem;
  min-width: 180px;
  max-width: 300px;
  width: 100%;
  box-sizing: border-box;
}

.search-box button {
  background-color: #1e3a8a;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
}

.table-wrapper {
  width: 100%;
  overflow-x: auto;
  table-layout: fixed;
}

.user-table {
  width: 100%;
  border-collapse: collapse;
  margin-top: 1rem;
  max-width: 100%;
}

@media (max-width: 600px) {
  .user-table {
    margin-top: 0.01rem; /* ←スマホだけ詰める！ */
  }
}

.user-table th,
.user-table td {
  padding: 12px;
  border-bottom: 1px solid #ccc;
  text-align: left;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.user-table thead {
  background-color: #f0f4ff;
}

.no-data {
  text-align: center;
  color: #999;
}

.pagination {
  margin: 1rem 0;
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 1rem;
}

@media (max-width: 600px) {
  .user-table {
    transform: scale(0.7);
    transform-origin: top left;
  }

  .responsive-wrapper {
    transform: scale(0.7);
    transform-origin: top left;
  }

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
    font-size: 2rem;
  }

  .user-table th,
  .user-table td {
    padding: 8px;
  }
}
</style>
