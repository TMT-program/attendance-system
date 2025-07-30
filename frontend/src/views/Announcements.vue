<template>
  <div class="announcement-page">
    <h1>📢 周知事項</h1>
    <div v-if="announcements.length > 0">
      <ul>
        <li v-for="file in announcements" :key="file">
          <a :href="`${PDF_BASE_URL}/${file}`" target="_blank" rel="noopener">
            {{ file }}
          </a>
        </li>
      </ul>
    </div>
    <div v-else>
      今は表示できるPDFはありません
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import axios from 'axios'

const API_BASE_URL = 'http://localhost:3000'
const PDF_BASE_URL = `${API_BASE_URL}/static` // 静的PDFファイルがここにある前提

// ✅ 空配列で初期化するのが重要
const announcements = ref<string[]>([])

onMounted(async () => {
  try {
    const res = await axios.get(`${API_BASE_URL}/api/info`)
    announcements.value = res.data || []
  } catch (error) {
    console.error('周知事項取得エラー:', error)
    announcements.value = []
  }
})
</script>

<style scoped>
.announcement-page {
  padding: 2rem;
  max-width: 800px;
  margin: 0 auto;
  font-family: 'Segoe UI', sans-serif;
}
h1 {
  font-size: 1.5rem;
  color: #1f2937;
  margin-bottom: 1rem;
}
ul {
  list-style: none;
  padding: 0;
}
li {
  margin-bottom: 0.5rem;
}
a {
  color: #2563eb;
  text-decoration: none;
}
a:hover {
  text-decoration: underline;
}
</style>
