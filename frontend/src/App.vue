<template>
  <div>
    <AppHeader v-if="showHeader" />
    <div
      class="main-content"
      :class="{ 'with-header': showHeader }"
    >
      <router-view />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import AppHeader from './components/AppHeader.vue'
import { useRoute } from 'vue-router'

const route = useRoute()

// ログイン画面ではヘッダーを非表示
const showHeader = computed(() => route.path !== '/login')
</script>

<style>
/* =========================
   グローバル
========================= */
:root {
  --app-header-h: 64px;
}

body {
  background-color: #f8fafc;
  margin: 0;
  padding: 0;
  min-height: 100vh;
  overflow-x: hidden;
}

/* =========================
   メインコンテンツ
========================= */
.main-content {
  min-height: 100vh;
  box-sizing: border-box;
  overflow-x: hidden;
}

/* ✅ ヘッダーがある画面だけ余白を取る（必須） */
.main-content.with-header {
  padding-top: var(--app-header-h);
}

/* =========================
   スマホ向け（必要なら）
========================= */
@media (max-width: 480px) {
  :root {
    --app-header-h: 64px;
  }
}

</style>
