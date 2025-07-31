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

<style scoped>
.main-content {
  padding-top: 64px; /* ヘッダー分の余白 */
}
</style>
