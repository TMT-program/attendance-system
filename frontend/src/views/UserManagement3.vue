
<template>
  <div class="user-management">
    <h1 class="page-title">👥 ユーザー管理</h1>

    <!-- メニュー -->
    <div v-if="currentView === 'menu'" class="menu-grid">
      <button class="menu-card" @click="showList" @mouseenter="hover = 'list'" @mouseleave="hover = ''">
        <ClipboardList :class="['icon', hover === 'list' ? 'hovered' : '']" />
        <span class="text">ユーザー一覧表示</span>
      </button>
      <button class="menu-card" @click="showAdd" @mouseenter="hover = 'add'" @mouseleave="hover = ''">
        <UserPlus :class="['icon', hover === 'add' ? 'hovered' : '']" />
        <span class="text">ユーザー追加</span>
      </button>
      <button class="menu-card" @click="showDelete" @mouseenter="hover = 'delete'" @mouseleave="hover = ''">
        <UserMinus :class="['icon', hover === 'delete' ? 'hovered' : '']" />
        <span class="text">ユーザー削除</span>
      </button>
    </div>

    <!-- ユーザー一覧 -->
    <div v-else-if="currentView === 'list'" class="user-section">
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
      <button class="back-button" @click="goBack">← メニューに戻る</button>
    </div>

    <!-- ユーザー追加 -->
    <div v-else-if="currentView === 'add'" class="user-section">
      <h2 class="section-title">➕ ユーザー追加</h2>
      <div class="form-box">
        <input v-model="newEmail" type="email" placeholder="メールアドレス" />
        <input v-model="newPassword" type="password" placeholder="パスワード" />
        <button @click="addUser">追加</button>
      </div>
      <p v-if="addMessage">{{ addMessage }}</p>
      <button class="back-button" @click="goBack">← メニューに戻る</button>
    </div>

    <!-- ユーザー削除 -->
    <div v-else-if="currentView === 'delete'" class="user-section">
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
          <tr v-for="user in paginatedUsersDelete" :key="user.uid" :class="{ selected: selectedUser?.uid === user.uid }" @click="selectUser(user)">
            <td>{{ user.displayName || '(名前なし)' }}</td>
            <td>{{ user.email }}</td>
            <td>{{ user.isAdmin ? 'あり' : 'なし' }}</td>
          </tr>
          <tr v-if="paginatedUsersDelete.length === 0">
            <td colspan="3" class="no-data">該当するユーザーがいません</td>
          </tr>
        </tbody>
      </table>
      <div class="pagination">
        <button @click="prevPageDelete" :disabled="pageDelete === 1">←</button>
        <span>{{ pageDelete }} / {{ totalPagesDelete }}</span>
        <button @click="nextPageDelete" :disabled="pageDelete === totalPagesDelete">→</button>
      </div>
      <div v-if="selectedUser" class="confirm-box">
        <button class="delete-button" @click="showConfirm = true">選択したユーザーを削除</button>
      </div>
      <p v-if="deleteMessage">{{ deleteMessage }}</p>
      <button class="back-button" @click="goBack">← メニューに戻る</button>
    </div>

    <!-- 削除確認モーダル -->
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
import { ref, computed } from 'vue'
import axios from 'axios'
import { ClipboardList, UserPlus, UserMinus } from 'lucide-vue-next'

interface User {
  uid: string
  email: string
  displayName: string
  isAdmin: boolean
}

const users = ref<User[]>([])
const currentView = ref<'menu' | 'list' | 'add' | 'delete'>('menu')

const searchKeyword = ref('')
const page = ref(1)
const pageSize = 10

const pageDelete = ref(1)
const newEmail = ref('')
const newPassword = ref('')
const addMessage = ref('')
const selectedUser = ref<User | null>(null)
const deleteMessage = ref('')
const showConfirm = ref(false)
const hover = ref('')

// 一覧フィルター
const filteredUsers = computed(() =>
  users.value.filter(user =>
    user.displayName.toLowerCase().includes(searchKeyword.value.toLowerCase()) ||
    user.email.toLowerCase().includes(searchKeyword.value.toLowerCase())
  )
)
const paginatedUsers = computed(() => {
  const start = (page.value - 1) * pageSize
  return filteredUsers.value.slice(start, start + pageSize)
})
const totalPages = computed(() => Math.max(1, Math.ceil(filteredUsers.value.length / pageSize)))

const filteredUsersDelete = computed(() => users.value)
const paginatedUsersDelete = computed(() => {
  const start = (pageDelete.value - 1) * pageSize
  return filteredUsersDelete.value.slice(start, start + pageSize)
})
const totalPagesDelete = computed(() => Math.max(1, Math.ceil(filteredUsersDelete.value.length / pageSize)))

const showList = async () => {
  try {
    const res = await axios.get<User[]>('http://localhost:3000/api/users')
    users.value = res.data
    page.value = 1
    currentView.value = 'list'
  } catch (error) {
    console.error('ユーザー取得失敗:', error)
  }
}

const showAdd = () => {
  newEmail.value = ''
  newPassword.value = ''
  addMessage.value = ''
  currentView.value = 'add'
}

const showDelete = async () => {
  try {
    const res = await axios.get<User[]>('http://localhost:3000/api/users')
    users.value = res.data
    selectedUser.value = null
    deleteMessage.value = ''
    pageDelete.value = 1
    currentView.value = 'delete'
  } catch (error) {
    console.error('ユーザー取得失敗:', error)
  }
}

const addUser = async () => {
  try {
    const res = await axios.post<User>('http://localhost:3000/api/users', {
      email: newEmail.value,
      password: newPassword.value,
      displayName: newEmail.value.split('@')[0]
    })
    addMessage.value = `${res.data.email} を追加しました`
    newEmail.value = ''
    newPassword.value = ''
  } catch (error) {
    console.error('追加失敗:', error)
    addMessage.value = 'ユーザー追加に失敗しました'
  }
}

const selectUser = (user: User) => {
  selectedUser.value = user
}

const deleteUser = async () => {
  if (!selectedUser.value) return
  try {
    await axios.delete(`http://localhost:3000/api/users/${selectedUser.value.uid}`)
    deleteMessage.value = `${selectedUser.value.displayName} を削除しました`
    users.value = users.value.filter(u => u.uid !== selectedUser.value?.uid)
    selectedUser.value = null
    showConfirm.value = false
  } catch (error) {
    console.error('削除失敗:', error)
    deleteMessage.value = 'ユーザー削除に失敗しました'
    showConfirm.value = false
  }
}

const toggleAdmin = async (user: User, event: Event) => {
  const isChecked = (event.target as HTMLInputElement).checked
  try {
    await axios.patch(`http://localhost:3000/api/users/${user.uid}/role`, {
      isAdmin: isChecked
    })
    user.isAdmin = isChecked
  } catch (error) {
    console.error('管理者権限変更失敗:', error);
    (event.target as HTMLInputElement).checked = !isChecked
  }
}

const searchUsers = () => {
  page.value = 1
}

const prevPage = () => {
  if (page.value > 1) page.value--
}
const nextPage = () => {
  if (page.value < totalPages.value) page.value++
}
const prevPageDelete = () => {
  if (pageDelete.value > 1) pageDelete.value--
}
const nextPageDelete = () => {
  if (pageDelete.value < totalPagesDelete.value) pageDelete.value++
}

const goBack = () => {
  currentView.value = 'menu'
}
</script>


<style scoped>
.user-management {
  padding: 2rem;
  max-width: 900px;
  margin: 0 auto;
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  text-align: center;
  color: #1e3a8a;
  background-color: #f8fafc;
}

.page-title {
  font-size: 2.4rem;
  margin-bottom: 2rem;
  font-weight: bold;
}

.menu-grid {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 2rem;
}

.menu-card {
  width: 260px;
  height: 160px;
  border: 2px solid #1e3a8a;
  border-radius: 12px;
  background-color: #f0f8ff;
  color: #1e3a8a;
  font-size: 1.2rem;
  font-weight: bold;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  cursor: pointer;
  transition: all 0.3s ease;
}

.menu-card:hover {
  background-color: #dbeafe;
  transform: translateY(-4px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.icon {
  width: 40px;
  height: 40px;
  margin-bottom: 0.5rem;
  color: #1e3a8a;
  transition: color 0.3s ease;
}

.icon.hovered {
  color: #dc2626;
}

.text {
  font-size: 1.1rem;
}

.section-title {
  font-size: 1.8rem;
  margin-bottom: 1.5rem;
}

.search-box {
  margin-bottom: 1rem;
}

.search-box input {
  padding: 0.5rem;
  width: 220px;
  font-size: 1rem;
  margin-right: 0.5rem;
  border: 1px solid #ccc;
  border-radius: 4px;
}

.search-box button {
  padding: 0.5rem 1rem;
  font-size: 1rem;
  background-color: #1e3a8a;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
}

.search-box button:hover {
  background-color: #3b82f6;
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

.form-box input {
  display: block;
  margin: 0.5rem auto;
  padding: 0.5rem;
  width: 300px;
  font-size: 1rem;
  border: 1px solid #ccc;
  border-radius: 4px;
}

.form-box button {
  padding: 0.5rem 1.5rem;
  background-color: #1e3a8a;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 1rem;
}

.form-box button:hover {
  background-color: #3b82f6;
}

.confirm-box {
  margin-top: 1rem;
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
