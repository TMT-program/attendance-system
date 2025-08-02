<template>
  <div class="announcement-page">
    <h1 class="page-title">
      <Megaphone class="icon" /> 周知事項
    </h1>

    <div v-if="announcements.length > 0">
      <table class="announcement-table">
        <thead>
          <tr>
            <th>ファイル名</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="file in announcements" :key="file">
            <td class="file-name">
              <a :href="`${PDF_BASE_URL}/${file}`" target="_blank" rel="noopener">
                {{ file }}
              </a>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div v-else class="no-data">
      今は表示できるPDFはありません
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import axios from 'axios'
import { Megaphone } from 'lucide-vue-next'

const API_BASE_URL = 'http://localhost:3000'
const PDF_BASE_URL = `${API_BASE_URL}/static`

const announcements = ref<string[]>([])

onMounted(async () => {
  try {
    const res = await axios.get<string[]>(`${API_BASE_URL}/api/info`)
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
  color: #1e3a8a;
}

.page-title {
  font-size: 1.8rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-weight: bold;
  margin-bottom: 1.5rem;
}

.icon {
  width: 1.5rem;
  height: 1.5rem;
  stroke: #1e3a8a;
}

.announcement-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.95rem;
  background-color: #f4f6f8; /* テーブル全体の背景をグレーにして際立たせる */
  border: 1px solid #ccc;
  border-radius: 6px;
  overflow: hidden;
}

.announcement-table th {
  text-align: left;
  background-color: #dbeafe; /* ヘッダーを青系で強調 */
  padding: 10px 12px;
  border-bottom: 1px solid #bbb;
  font-weight: 600;
}

.announcement-table td {
  padding: 8px 12px;
  border-bottom: 1px solid #e0e0e0;
}

.announcement-table .file-name {
  text-align: left;
}

.announcement-table tr:hover {
  background-color: #eef3ff;
}

a {
  color: #2563eb;
  text-decoration: none;
}

a:hover {
  text-decoration: underline;
}

.no-data {
  color: #555;
  font-size: 0.95rem;
  text-align: center;
  padding: 1rem;
}
</style>
