<template>
  <div class="user-management">
    <h1 class="page-title">👥 ユーザー管理</h1>

    <LoadingSpinner v-if="isLoading" />

    <template v-else>
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
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import api from '../api'
import UserMenu from './UserMenu.vue'
import UserList from './UserList.vue'
import UserAdd from './UserAdd.vue'
import UserDelete from './UserDelete.vue'
import LoadingSpinner from '../components/LoadingSpinner.vue'
import type { User } from '../components/types'


const currentView = ref<'menu' | 'list' | 'add' | 'delete'>('menu')
const users = ref<User[]>([])
const isLoading = ref(false)

const showHeaderBack = computed(() => currentView.value !== 'menu')

function goBackToMenu() {
  currentView.value = 'menu'
}

async function fetchUsers() {
  try {
    const res = await api.get<User[]>('/api/users')
    users.value = res.data
  } catch (error) {
    console.error('ユーザー取得失敗:', error)
  }
}

async function changeView(view: 'menu' | 'list' | 'add' | 'delete') {
  isLoading.value = true

  if (view === 'list' || view === 'delete') {
    await fetchUsers()
  }

  currentView.value = view

  // 軽く遅延させてスピナーを一瞬表示（視覚的に効果を感じるように）
  setTimeout(() => {
    isLoading.value = false
  }, 300)
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
