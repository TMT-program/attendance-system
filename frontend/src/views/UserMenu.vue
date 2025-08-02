<template>
  <div class="menu-grid">
    <button class="menu-card" @click="$emit('change-view', 'list')" @mouseenter="hover = 'list'" @mouseleave="hover = ''">
      <ClipboardList :class="['icon', hover === 'list' ? 'hovered' : '']" />
      <span class="text">ユーザー一覧表示</span>
    </button>
    <button class="menu-card" @click="$emit('change-view', 'add')" @mouseenter="hover = 'add'" @mouseleave="hover = ''">
      <UserPlus :class="['icon', hover === 'add' ? 'hovered' : '']" />
      <span class="text">ユーザー追加</span>
    </button>
    <button class="menu-card" @click="$emit('change-view', 'delete')" @mouseenter="hover = 'delete'" @mouseleave="hover = ''">
      <UserMinus :class="['icon', hover === 'delete' ? 'hovered' : '']" />
      <span class="text">ユーザー削除</span>
    </button>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { ClipboardList, UserPlus, UserMinus } from 'lucide-vue-next'

const hover = ref('')
</script>

<style scoped>
.menu-grid {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 2rem;
  margin-top: 2rem;
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
</style>
