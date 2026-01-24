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
        <!-- ✅ PC/タブレット：テーブル表示 -->
        <table class="user-table pc-only" role="table" aria-label="ユーザー一覧テーブル">
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

        <!-- ✅ スマホ：カード表示 -->
        <div class="mobile-only">
          <div v-if="paginatedUsers.length === 0" class="no-data">該当するユーザーがいません</div>

          <div v-for="user in paginatedUsers" :key="user.uid" class="user-card">
            <div class="card-row">
              <span class="label">名前</span>
              <span class="value" :title="user.displayName || '(名前なし)'">
                {{ user.displayName || '(名前なし)' }}
              </span>
            </div>

            <div class="card-row">
              <span class="label">メール</span>
              <span
                class="value mono scrollable"
                :title="user.email"
              >
                {{ user.email }}
              </span>
            </div>

            <div class="card-row admin-row">
              <span class="label">管理者</span>
              <label class="check-wrap" :aria-label="`管理者権限: ${user.displayName || user.email}`">
                <input
                  type="checkbox"
                  :checked="user.isAdmin"
                  @change="toggleAdmin(user, $event)"
                />
                <span class="check-label">{{ user.isAdmin ? 'ON' : 'OFF' }}</span>
              </label>
            </div>
          </div>
        </div>

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
import { ref, computed, onMounted } from 'vue'
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

/* =========================
   共通ラッパー
========================= */
.responsive-wrapper {
  transition: transform 0.2s ease;
}

/* =========================
   タイトル
========================= */
.section-title {
  font-size: 1.9rem;
  margin-bottom: 1rem;
  color: #0f172a;
  text-align: center;
  white-space: nowrap;
  font-weight: 700;
}

/* =========================
   検索ボックス
========================= */
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

/* =========================
   テーブルラッパー
========================= */
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

/* =========================
   PC用テーブル
========================= */
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
  border-right: 1px solid #e2e8f0;
  white-space: nowrap;
}

.user-table thead th:last-child {
  border-right: none;
}

.user-table th,
.user-table td {
  padding: 12px 14px;
  border-bottom: 1px solid #e2e8f0;
  border-right: 1px solid #e2e8f0;
  text-align: left;
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

.user-table td:nth-child(1) {
  min-width: 160px;
}

.user-table td:nth-child(2) {
  min-width: 220px;
}

.user-table .col-admin {
  min-width: 140px;
  text-align: left;
}

/* =========================
   チェックボックス
========================= */
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

/* =========================
   データなし表示
========================= */
.no-data {
  text-align: center;
  color: #64748b;
  padding: 18px 0;
  font-weight: 600;
}

/* =========================
   ページネーション
========================= */
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

/* =========================
   表示切り替え
========================= */
.pc-only {
  display: table;
}

.mobile-only {
  display: none;
}

/* =========================
   スマホ用カードUI
========================= */
.user-card {
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 12px;
  margin: 10px;
  overflow: hidden;
  background: #ffffff;
  box-shadow:
    0 1px 1px rgba(15, 23, 42, 0.04),
    0 4px 10px rgba(15, 23, 42, 0.05);
}

.card-row {
  display: grid;
  grid-template-columns: 70px 1fr;
  gap: 10px;
  align-items: center;
  padding: 6px 0;
  border-bottom: 1px dashed #e2e8f0;

  /* ✅ これが超重要：右カラムが縮められるようになる */
  min-width: 0;
}

.card-row:last-child {
  border-bottom: none;
}

.label {
  font-size: 0.82rem;
  color: #64748b;
  font-weight: 700;
  white-space: nowrap;
}

.value {
  font-size: 0.95rem;
  color: #0f172a;

  text-align: left;
  justify-self: start;

  /* ✅ gridの中で縮めるために必要 */
  min-width: 0;

  /* PCでは省略のまま */
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}


/* ✅ スマホのときだけ「横スクロールで全文確認」 */
@media (max-width: 600px) {
  .value {
    overflow-x: auto;          /* 横スクロール */
    overflow-y: hidden;
    text-overflow: clip;       /* …をやめる */
    -webkit-overflow-scrolling: touch;
  }

  /* スクロールバーが邪魔なら “見た目だけ” 消せる（任意） */
  .value::-webkit-scrollbar {
    height: 6px;
  }

  .search-box input {
    font-size: 16px;              /* ✅ iOSの自動ズーム抑制 */
    line-height: 1.2;
  }
}

.value.scrollable {
  display: block;
  max-width: 100%;
  min-width: 0;
  overflow-x: auto;
  overflow-y: hidden;
  white-space: nowrap;
  text-overflow: clip;
  -webkit-overflow-scrolling: touch;
}


.mono {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas,
    "Liberation Mono", "Courier New", monospace;
}

.admin-row .check-wrap {
  justify-self: start;
}

/* =========================
   スマホ対応（600px以下）
========================= */
@media (max-width: 600px) {
  .pc-only {
    display: none;
  }

  .mobile-only {
    display: block;
  }

  /* scale方式は廃止（崩れ防止） */
  .user-table,
  .responsive-wrapper {
    transform: none;
  }

  .user-section {
    padding: 0.75rem;
  }

  .section-title {
    font-size: 1.35rem;
    margin-bottom: 0.5rem;
  }

  .search-box {
    flex-direction: column;
    align-items: center;
    margin-bottom: 0.5rem;
  }

  .search-box input {
    min-width: unset;
    max-width: 100%;
    width: 100%;
  }

  .search-box button {
    width: 100%;
    max-width: 420px;
  }

  .pagination {
    margin: 0.4rem 0;
  }

  .pagination span {
    font-size: 1rem;
  }
}

</style>
