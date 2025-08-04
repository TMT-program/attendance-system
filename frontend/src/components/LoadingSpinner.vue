<template>
  <div class="spinner-wrapper">
    <Loader2 class="spinner" />
    <p class="text">読み込み中...</p>
  </div>
</template>

<script setup lang="ts">
import { Loader2 } from 'lucide-vue-next'
</script>

<style scoped>
.spinner-wrapper {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 2rem;
  color: #2563eb;
}

.spinner {
  width: 48px;
  height: 48px;
  animation: spin 1s linear infinite;
  stroke-width: 2.5;
  color: #2563eb;
  margin-bottom: 0.5rem;
}

.text {
  font-size: 1rem;
  color: #1e3a8a;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}
</style>
