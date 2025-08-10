<template>
  <div class="confirm-user-list">
    <h2 class="section-title">ユーザー一覧</h2>

    <div class="responsive-wrapper">
      <!-- くっきり表示用のカード枠 -->
      <div class="table-wrapper">
        <table class="user-table" role="table" aria-label="勤務実績確認用ユーザー一覧">
          <thead>
            <tr>
              <th scope="col">ユーザー名</th>
              <th scope="col">メールアドレス</th>
              <th scope="col" class="col-action">操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="user in paginatedUsers" :key="user.uid">
              <td :title="user.displayName || '-'">{{ user.displayName || '-' }}</td>
              <td :title="user.email">{{ user.email }}</td>
              <td class="col-action">
                <button
                  class="primary-btn"
                  @click="selectUser(user)"
                  aria-label="このユーザーの勤務実績を確認"
                >
                  確認
                </button>
              </td>
            </tr>
            <tr v-if="paginatedUsers.length === 0">
              <td colspan="3" class="no-data">該当するユーザーがいません</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="pagination" role="navigation" aria-label="ページネーション">
        <button @click="prevPage" :disabled="currentPage === 1" aria-label="前のページ">←</button>
        <span aria-live="polite">{{ currentPage }} / {{ totalPages }}</span>
        <button @click="nextPage" :disabled="currentPage === totalPages" aria-label="次のページ">→</button>
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
    displayName: (doc.data() as any).displayName || '',
    email: (doc.data() as any).email || '',
  }))
}

const totalPages = computed(() =>
  Math.max(1, Math.ceil(users.value.length / usersPerPage))
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
  background-color: #f8fafc;
  padding: 1rem;
  max-width: 1000px;
  margin: 0 auto;
  color: #0f172a;
  -webkit-font-smoothing: antialiased;
  text-rendering: optimizeLegibility;
}

.section-title {
  font-size: 1.8rem;
  margin: 0.6rem auto 1rem auto;
  color: #0f172a;
  text-align: center;
  font-weight: 700;
  width: fit-content;
}

.responsive-wrapper {
  overflow-x: auto;
}

/* カード枠で“くっきり”見せる */
.table-wrapper {
  border: 1px solid #94a3b8;          /* 外枠を少し濃いめに */
  border-radius: 12px;
  background: #ffffff;
  box-shadow:
    0 6px 16px rgba(15, 23, 42, 0.12),
    0 1px 0 rgba(15, 23, 42, 0.06);
  overflow: hidden;                    /* 角丸を効かせる */
}

/* くっきり系テーブル（縦線・ヘッダー強調） */
.user-table {
  width: 100%;
  border-collapse: separate; /* 罫線を明確に */
  border-spacing: 0;
  font-size: 0.95rem;
  min-width: 600px;
  color: #0f172a;
}

.user-table thead th {
  background-color: #eaf1ff;          /* ヘッダーのコントラストUP */
  font-weight: 700;
  padding: 12px 16px;
  text-align: left;                    /* すべて左寄せ */
  border-bottom: 2px solid #94a3b8;   /* 下線太め */
  border-right: 1px solid #e2e8f0;    /* 縦線 */
  white-space: nowrap;
}
.user-table thead th:last-child {
  border-right: none;
}

/* セルも左寄せに統一 */
.user-table td {
  padding: 12px 16px;
  border-bottom: 1px solid #e2e8f0;   /* セルの区切り */
  border-right: 1px solid #e2e8f0;    /* 縦線 */
  white-space: nowrap;
  vertical-align: middle;
  text-align: left;                   /* ← 左寄せ */
}
.user-table td:last-child {
  border-right: none;
}

/* 行ホバーでより“くっきり” */
.user-table tbody tr:hover {
  background-color: #eef6ff;
}

/* “データなし”表示 */
.no-data {
  text-align: center;
  color: #64748b;
  padding: 1rem 0;
  font-weight: 600;
}

/* ページネーション（コントラスト強め） */
.pagination {
  margin: 0.9rem 0;
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 1rem;
}
.pagination button {
  padding: 0.35rem 0.75rem;
  font-size: 1.05rem;
  border: 1px solid #1e3a8a;
  border-radius: 8px;
  background-color: #ffffff;
  color: #1e3a8a;
  cursor: pointer;
  transition: background-color 0.2s ease, box-shadow 0.2s ease;
}
.pagination button:hover:not(:disabled) {
  background-color: #dbeafe;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.15);
}
.pagination button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.pagination span {
  font-weight: 700;
  letter-spacing: 0.02em;
}

/* ボタン（提出系トーンに統一） */
.primary-btn {
  background-color: #2563eb;
  color: #ffffff;
  border: 1px solid #2563eb;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 700;
  padding: 0.4rem 0.8rem;
  font-size: 0.9rem;
}
.primary-btn:hover {
  filter: brightness(1.05);
}

/* スマホ向け縮小表示（他ページと統一） */
@media (max-width: 600px) {
  .responsive-wrapper {
    transform: scale(0.78);
    transform-origin: top left;
  }
  .section-title {
    font-size: 1.4rem;
    margin-bottom: 0.5rem;
  }
  .user-table thead th,
  .user-table td {
    padding: 10px 12px;
    font-size: 0.9rem;
  }
  .pagination {
    margin: 0.4rem 0;
  }
}
</style>
