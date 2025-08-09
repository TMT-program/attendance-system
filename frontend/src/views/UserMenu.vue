<template>
  <div class="menu-grid" :aria-busy="isLoading">
    <!-- ローディングオーバーレイ -->
    <div v-if="isLoading" class="spinner-overlay">
      <LoadingSpinner />
      <p class="loading-text">読み込み中...</p>
    </div>

    <button
      class="menu-card"
      :disabled="isLoading"
      @click="handleNavigate('list')"
      @mouseenter="hover = 'list'"
      @mouseleave="hover = ''"
    >
      <ClipboardList :class="['icon', hover === 'list' ? 'hovered' : '']" />
      <span class="text">ユーザー一覧表示</span>
    </button>

    <button
      class="menu-card"
      :disabled="isLoading"
      @click="handleNavigate('add')"
      @mouseenter="hover = 'add'"
      @mouseleave="hover = ''"
    >
      <UserPlus :class="['icon', hover === 'add' ? 'hovered' : '']" />
      <span class="text">ユーザー追加</span>
    </button>

    <button
      class="menu-card"
      :disabled="isLoading"
      @click="handleNavigate('delete')"
      @mouseenter="hover = 'delete'"
      @mouseleave="hover = ''"
    >
      <UserMinus :class="['icon', hover === 'delete' ? 'hovered' : '']" />
      <span class="text">ユーザー削除</span>
    </button>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { ClipboardList, UserPlus, UserMinus } from 'lucide-vue-next'
import LoadingSpinner from '../components/LoadingSpinner.vue'

const hover = ref('')
const isLoading = ref(false)

const emit = defineEmits<{
  (e: 'change-view', view: 'list' | 'add' | 'delete'): void
}>()

const handleNavigate = (view: 'list' | 'add' | 'delete') => {
  // クリック直後からスピナー表示
  isLoading.value = true
  // 親へ遷移通知（このコンポーネントは画面切替でアンマウントされる想定）
  emit('change-view', view)
}
</script>

<style scoped>
.menu-grid {
  position: relative; /* オーバーレイの基準にする */
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 2rem;
  margin-top: 2rem;
  min-height: 200px; /* スピナーの見やすさ確保 */
}

.spinner-overlay {
  position: absolute;
  inset: 0;
  background: rgba(255, 255, 255, 0.65);
  backdrop-filter: blur(2px);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  z-index: 10;
}

.loading-text {
  margin-top: 0.5rem;
  font-size: 0.95rem;
  color: #1e3a8a;
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

.menu-card:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
  box-shadow: none;
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
</style>
