<template>
  <div>
    <AppHeader v-if="showHeader" />
    <div class="main-content">
      <router-view />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import AppHeader from './components/AppHeader.vue'
import { useRoute } from 'vue-router'

const route = useRoute()

// ログイン画面ではヘッダーを非表示にする
const showHeader = computed(() => route.path !== '/login')
</script>

<style>
body {
  background-color: #f8fafc;
  margin: 0;
  padding: 0;
  height: 100%;
  /* overflow: hidden; ← これを削除してスクロールを有効に */
}

.main-content {
  padding-top: 64px; /* ヘッダー分の余白 */
  min-height: calc(100vh - 64px);
  box-sizing: border-box;
  overflow-x: hidden; /* 横スクロールは防止 */
}
</style>
