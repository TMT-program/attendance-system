<template>
  <div class="user-section">
    <div v-if="isLoading">
      <LoadingSpinner />
    </div>

    <div v-else>
      <div class="table-wrapper">
        <h2 class="section-title">🗑️ ユーザー削除</h2>

        <!-- ✅ PC/タブレット：テーブル表示 -->
        <table class="user-table pc-only" role="table" aria-label="ユーザー削除テーブル">
          <thead>
            <tr>
              <th scope="col" class="col-check" aria-label="選択">選択</th>
              <th scope="col">名前</th>
              <th scope="col">メールアドレス</th>
              <th scope="col" class="col-admin">管理者権限</th>
            </tr>
          </thead>

          <tbody>
            <tr
              v-for="user in paginatedUsers"
              :key="user.uid"
              :class="{ selected: isSelected(user) }"
            >
              <td class="col-check">
                <input
                  type="checkbox"
                  class="row-checkbox"
                  :checked="isSelected(user)"
                  @change="toggleSelectUser(user, $event)"
                  :aria-label="`削除対象として選択: ${user.displayName || user.email}`"
                />
              </td>

              <td :title="user.displayName || '(名前なし)'">
                {{ user.displayName || '(名前なし)' }}
              </td>
              <td :title="user.email">{{ user.email }}</td>
              <td class="col-admin">{{ user.isAdmin ? 'あり' : 'なし' }}</td>
            </tr>

            <tr v-if="paginatedUsers.length === 0">
              <td colspan="4" class="no-data">該当するユーザーがいません</td>
            </tr>
          </tbody>
        </table>

        <!-- ✅ スマホ：カード表示 -->
        <div class="mobile-only">
          <div v-if="paginatedUsers.length === 0" class="no-data">該当するユーザーがいません</div>

          <div v-for="user in paginatedUsers" :key="user.uid" class="user-card">
            <div class="card-row">
              <span class="label">選択</span>
              <span class="value">
                <input
                  type="checkbox"
                  class="row-checkbox"
                  :checked="isSelected(user)"
                  @change="toggleSelectUser(user, $event)"
                  :aria-label="`削除対象として選択: ${user.displayName || user.email}`"
                />
              </span>
            </div>

            <div class="card-row">
              <span class="label">名前</span>
              <span class="value" :title="user.displayName || '(名前なし)'">
                {{ user.displayName || '(名前なし)' }}
              </span>
            </div>

            <div class="card-row">
              <span class="label">メール</span>
              <span class="value mono scrollable" :title="user.email">
                {{ user.email }}
              </span>
            </div>

            <div class="card-row">
              <span class="label">管理者</span>
              <span class="value">{{ user.isAdmin ? 'あり' : 'なし' }}</span>
            </div>
          </div>
        </div>

        <div class="pagination">
          <button @click="prevPage" :disabled="page === 1">←</button>
          <span>{{ page }} / {{ totalPages }}</span>
          <button @click="nextPage" :disabled="page === totalPages">→</button>
        </div>
      </div>

      <!-- ここに余白を付けてテーブルとボタンがくっつかないようにする -->
      <div v-if="selectedUsers.length > 0" class="confirm-box">
        <button
          class="delete-button"
          :disabled="isProtectedSelected"
          @click="showConfirm = true"
          :title="isProtectedSelected ? 'デモ版ではデモ用ユーザーは削除できません' : '選択中のユーザーを削除'"
        >
          選択したユーザーを削除（{{ selectedUsers.length }}件）
        </button>
        <p v-if="isProtectedSelected" class="hint">
          デモ版では次のユーザーは削除できません：{{ protectedSelectedNames }}
        </p>
      </div>

      <p v-if="deleteMessage">{{ deleteMessage }}</p>

      <div v-if="showConfirm" class="modal-overlay" role="dialog" aria-modal="true">
        <div class="modal">
          <p>
            次の{{ selectedUsers.length }}件のユーザーを削除しますか？<br />
            <span class="target-list">{{ selectedNamesPreview }}</span>
          </p>
          <div class="modal-actions">
            <button class="delete-button" @click="deleteUsers">削除</button>
            <button @click="showConfirm = false">キャンセル</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import api from '../api'
import type { User } from '../components/types'
import LoadingSpinner from '../components/LoadingSpinner.vue'

const DEMO = import.meta.env.VITE_DEMO_FLAG === 'true'

const props = defineProps<{ users: User[] }>()
const emit = defineEmits<{ (e: 'refresh-users'): void }>()

/** 複数選択（チェックボックスでトグル） */
const selectedUsers = ref<User[]>([])
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

/** デモ用 削除禁止UID */
const PROTECTED_UIDS = new Set<string>([
  '5fvxqbgf4nPN1k1gR1vp2seFzOr1', // 管理者
  'Mc7myNRJ0HV5jmBh3yRgCwGtkHk2' // 一般
])

/** 行が選択されているか */
const isSelected = (user: User) => selectedUsers.value.some(u => u.uid === user.uid)

/**
 * ✅ チェックボックスでトグル選択
 * ほかのロジックは変更しない（selectedUsers の配列運用もそのまま）
 */
const toggleSelectUser = (user: User, e: Event) => {
  const checked = (e.target as HTMLInputElement).checked

  if (checked) {
    if (!isSelected(user)) {
      selectedUsers.value = [...selectedUsers.value, user]
    }
  } else {
    selectedUsers.value = selectedUsers.value.filter(u => u.uid !== user.uid)
  }
}

/** 保護対象が含まれているか（含まれていたら削除ボタンは無効化） */
const isProtectedSelected = computed(() => {
  if (!DEMO) return false
  return selectedUsers.value.some(u => PROTECTED_UIDS.has(u.uid))
})

/** 保護対象の表示名（ヒント表示用） */
const protectedSelectedNames = computed(() => {
  const names = selectedUsers.value
    .filter(u => PROTECTED_UIDS.has(u.uid))
    .map(u => u.displayName || u.email)
  return names.join(', ')
})

/** モーダルに表示する選択名（長すぎる場合は先頭5件＋他N件） */
const selectedNamesPreview = computed(() => {
  const names = selectedUsers.value.map(u => u.displayName || u.email)
  if (names.length <= 5) return names.join(', ')
  const head = names.slice(0, 5).join(', ')
  return `${head} ほか ${names.length - 5}件`
})

/** 一括削除 */
const deleteUsers = async () => {
  if (selectedUsers.value.length === 0) return
  if (DEMO && selectedUsers.value.some(u => PROTECTED_UIDS.has(u.uid))) {
    deleteMessage.value = 'デモ版では保護ユーザーが含まれているため削除できません'
    showConfirm.value = false
    return
  }

  isLoading.value = true
  try {
    // まとめて削除（同時送信・結果集計）
    const targets = selectedUsers.value.map(u => u)
    const results = await Promise.allSettled(
      targets.map(u => api.delete(`/api/users/${u.uid}`))
    )

    const success = results.filter(r => r.status === 'fulfilled').length
    const fail = results.length - success
    deleteMessage.value = `削除完了：${success}件 成功${fail > 0 ? `／${fail}件 失敗` : ''}`

    // 成功分を選択から外す・全体をクリア
    selectedUsers.value = []
    showConfirm.value = false

    // 最新リスト取得
    emit('refresh-users')
  } catch (error) {
    deleteMessage.value = 'ユーザー削除処理中にエラーが発生しました'
    showConfirm.value = false
  } finally {
    isLoading.value = false
  }
}
</script>

<style scoped>
.user-section {
  background-color: #f8fafc;
  padding: 1rem;
}

/* タイトル */
.section-title {
  font-size: 1.9rem;
  margin-bottom: 1rem;
  color: #0f172a;
  text-align: center;
  font-weight: 700;
}

/* テーブルコンテナ（外枠＆影） */
.table-wrapper {
  border: 1px solid #cbd5e1;
  border-radius: 10px;
  background: #fff;
  overflow-x: auto;
  box-shadow: 0 1px 1px rgba(15, 23, 42, 0.04), 0 4px 12px rgba(15, 23, 42, 0.06);
}

/* テーブル本体（縦線・左寄せ・ゼブラ・ホバー・選択強調） */
.user-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.95rem;
  color: #0f172a;
}

.user-table th,
.user-table td {
  padding: 12px 14px;
  border-bottom: 1px solid #e2e8f0;
  border-right: 1px solid #e2e8f0;
  text-align: left;
  white-space: nowrap;
}

.user-table th:last-child,
.user-table td:last-child {
  border-right: none;
}

.user-table thead th {
  background: #edf2ff;
  font-weight: 700;
  position: sticky;
  top: 0;
  z-index: 1;
}

.user-table tbody tr:nth-child(odd) {
  background: #f8fafc;
}

.user-table tbody tr:hover {
  background: #e8f0ff;
}

/* ✅ 選択状態（チェックボックスと連動） */
.user-table tbody tr.selected {
  background: #fdecea;
  box-shadow: inset 4px 0 0 #dc2626;
}

/* ✅ チェックボックス列 */
.col-check {
  width: 64px;
  min-width: 64px;
  text-align: center;
}

.user-table th.col-check,
.user-table td.col-check {
  text-align: center;
}

.row-checkbox {
  width: 18px;
  height: 18px;
  cursor: pointer;
  accent-color: #dc2626;
}

/* ページネーション */
.pagination {
  margin: 0.75rem 0;
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 1rem;
}

.pagination button {
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  background: #fff;
  padding: 0.4rem 0.7rem;
}

.pagination button:hover:not(:disabled) {
  background: #f1f5f9;
}

/* テーブルとボタンの間隔を確保 */
.confirm-box {
  margin-top: 1rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.4rem;
}

/* 削除ボタン */
.delete-button {
  background-color: #dc2626;
  color: #fff;
  padding: 0.6rem 1rem;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 700;
}
.delete-button:hover {
  background-color: #b91c1c;
}
.delete-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* 補足テキスト */
.hint {
  font-size: 0.9rem;
  color: #64748b;
  text-align: center;
}

/* モーダル */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.35);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}
.modal {
  background: #fff;
  padding: 2rem;
  border-radius: 12px;
  max-width: 90%;
  text-align: center;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
}
.modal .target-list {
  display: inline-block;
  margin-top: 0.5rem;
  color: #334155;
  font-weight: 600;
}
.modal-actions {
  margin-top: 1rem;
  display: flex;
  gap: 1rem;
  justify-content: center;
}

/* ✅ 表示切り替え */
.pc-only {
  display: table;
}
.mobile-only {
  display: none;
}

/* ✅ スマホ用カードUI */
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
  min-width: 0; /* ✅ はみ出し防止（重要） */
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
  min-width: 0; /* ✅ grid内で縮められるように */
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.mono {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas,
    "Liberation Mono", "Courier New", monospace;
}

/* ✅ スマホ時：メールだけ横スクロール */
@media (max-width: 600px) {
  .pc-only {
    display: none;
  }
  .mobile-only {
    display: block;
  }

  .user-section {
    padding: 0.75rem;
  }

  .section-title {
    font-size: 1.35rem;
    margin-bottom: 0.5rem;
  }

  .pagination {
    margin: 0.4rem 0;
  }

  .pagination span {
    font-size: 1rem;
  }

  .delete-button {
    font-size: 0.95rem;
  }

  .value.scrollable {
    display: block;
    max-width: 100%;
    min-width: 0;
    white-space: nowrap;
    overflow-x: auto;
    overflow-y: hidden;
    text-overflow: clip;
    -webkit-overflow-scrolling: touch;
  }

  .value.scrollable::-webkit-scrollbar {
    height: 6px;
  }
}
</style>
