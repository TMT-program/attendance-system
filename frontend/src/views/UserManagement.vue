<template>
  <div class="user-management">
    <AppHeader :onBack="showHeaderBack ? goBackToMenu : undefined" />
    <h1 class="page-title">👥 ユーザー管理</h1>

    <UserMenu v-if="currentView === 'menu'" @change-view="changeView" />
    <UserList
      v-if="currentView === 'list'"
      :users="users"
      @refresh-users="fetchUsers"
      @go-back="goBackToMenu"
    />
    <UserAdd
      v-if="currentView === 'add'"
      @go-back="goBackToMenu"
    />
    <UserDelete
      v-if="currentView === 'delete'"
      :users="users"
      @refresh-users="fetchUsers"
      @go-back="goBackToMenu"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import axios from 'axios'
import AppHeader from '../components/AppHeader.vue'
import UserMenu from './UserMenu.vue'
import UserList from './UserList.vue'
import UserAdd from './UserAdd.vue'
import UserDelete from './UserDelete.vue'
import type { User } from '../components/types'

const currentView = ref<'menu' | 'list' | 'add' | 'delete'>('menu')
const users = ref<User[]>([])

const showHeaderBack = computed(() => currentView.value !== 'menu')

function goBackToMenu() {
  currentView.value = 'menu'
}

async function fetchUsers() {
  try {
    const res = await axios.get<User[]>('${API_BASE_URL}/api/users')
    users.value = res.data
  } catch (error) {
    console.error('ユーザー取得失敗:', error)
  }
}

async function changeView(view: 'menu' | 'list' | 'add' | 'delete') {
  if (view === 'list' || view === 'delete') {
    await fetchUsers()
  }
  currentView.value = view
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
</style>
