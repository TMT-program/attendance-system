<template>
  <div class="announcement-page">
    <h1 class="page-title">
      <Megaphone class="icon" /> 周知事項
    </h1>

    <!-- アップロード -->
    <div v-if="isAdmin" class="upload-section">
      <button @click="toggleUploader">
        {{ showUploader ? 'アップロード領域を閉じる' : 'アップロード' }}
      </button>

      <div v-if="showUploader" class="upload-area" @dragover.prevent @drop.prevent="handleDrop">
        <p>ここにPDFファイルをドラッグ&ドロップしてください</p>

        <ul v-if="droppedFiles.length > 0">
          <li v-for="file in droppedFiles" :key="file.name">{{ file.name }}</li>
        </ul>

        <p v-if="errorMessage" class="error">{{ errorMessage }}</p>

        <button @click="uploadFiles" :disabled="droppedFiles.length === 0">アップロード実行</button>
      </div>
    </div>

    <!-- 読み込み中表示 -->
    <LoadingSpinner v-if="isLoading" />

    <!-- 一覧 -->
    <div v-else>
      <div v-if="announcements.length > 0">
        <table class="announcement-table">
          <thead>
            <tr>
              <th>ファイル名</th>
              <th v-if="isAdmin">削除</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="file in announcements" :key="file.name">
              <td class="file-name">
                <a :href="file.url" target="_blank" rel="noopener">{{ file.name }}</a>
              </td>
              <td v-if="isAdmin">
                <button @click="deleteFile(file.name)">削除</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <div v-else class="no-data">今は表示できるPDFはありません</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { Megaphone } from 'lucide-vue-next'
import axios from 'axios'
import { getAuth, onAuthStateChanged } from 'firebase/auth'
import { doc, getDoc } from 'firebase/firestore'
import { db } from '../firebase'
import LoadingSpinner from '../components/LoadingSpinner.vue'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL
const isAdmin = ref(false)
const uid = ref<string | null>(null)
const announcements = ref<{ name: string, url: string }[]>([])
const isLoading = ref(false)

const showUploader = ref(false)
const droppedFiles = ref<File[]>([])
const errorMessage = ref('')

const toggleUploader = () => {
  showUploader.value = !showUploader.value
  droppedFiles.value = []
  errorMessage.value = ''
}

const handleDrop = (event: DragEvent) => {
  const files = Array.from(event.dataTransfer?.files || [])
  const pdfs = files.filter((file) => file.type === 'application/pdf')

  if (pdfs.length !== files.length) {
    errorMessage.value = 'PDFファイルのみアップロードできます'
    droppedFiles.value = []
  } else {
    errorMessage.value = ''
    droppedFiles.value = pdfs
  }
}

const uploadFiles = async () => {
  const existingSet = new Set(announcements.value.map(file => file.name))
  const duplicated = droppedFiles.value.find(file => existingSet.has(file.name))

  if (duplicated) {
    errorMessage.value = '既存のPDFファイルと同名のファイルはアップロードできません'
    return
  }

  const formData = new FormData()
  droppedFiles.value.forEach(file => formData.append('files', file))

  try {
    isLoading.value = true
    await axios.post(`${API_BASE_URL}/api/info/upload`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
    alert('アップロード成功')
    await fetchAnnouncements()
    toggleUploader()
  } catch (err) {
    console.error('アップロード失敗', err)
    alert('アップロード失敗')
  } finally {
    isLoading.value = false
  }
}

const deleteFile = async (filename: string) => {
  if (!confirm(`"${filename}" を削除しますか？`)) return
  try {
    isLoading.value = true
    await axios.delete(`${API_BASE_URL}/api/info/${filename}`)
    await fetchAnnouncements()
  } catch (err) {
    console.error('削除失敗', err)
    alert('削除に失敗しました')
  } finally {
    isLoading.value = false
  }
}

const fetchAnnouncements = async () => {
  isLoading.value = true
  try {
    const res = await axios.get<{ name: string; url: string }[]>(`${API_BASE_URL}/api/info`)
    announcements.value = res.data || []
  } catch (error) {
    console.error('周知事項取得エラー:', error)
    announcements.value = []
  } finally {
    isLoading.value = false
  }
}

onMounted(() => {
  const auth = getAuth()
  onAuthStateChanged(auth, async (user) => {
    if (user) {
      uid.value = user.uid
      const userDoc = await getDoc(doc(db, 'users', user.uid))
      isAdmin.value = !!userDoc.data()?.isAdmin
    }
    fetchAnnouncements()
  })
})
</script>

<style scoped>
/* もとのスタイル省略せず同じ */
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
.upload-section button {
  background-color: #2563eb;
  color: white;
  padding: 0.5rem 1.2rem;
  border: none;
  border-radius: 5px;
  margin-bottom: 1rem;
  cursor: pointer;
}
.upload-area {
  border: 2px dashed #aaa;
  padding: 1rem;
  margin-bottom: 1rem;
  background-color: #f9fafb;
  text-align: center;
}
.upload-area ul {
  text-align: left;
  margin-top: 1rem;
}
.upload-area .error {
  color: red;
  margin-top: 0.5rem;
}
.announcement-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.95rem;
  background-color: #f4f6f8;
  border: 1px solid #ccc;
  border-radius: 6px;
  overflow: hidden;
}
.announcement-table th {
  text-align: left;
  background-color: #dbeafe;
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
