<template>
  <div class="announcement-page">
    <h1 class="page-title">
      <Megaphone class="icon" /> 周知事項
    </h1>

    <!-- アップロードセクション（管理者のみ表示） -->
    <div v-if="isAdmin" class="uploader-card">
      <div class="uploader-header">
        <h2>PDFアップロード</h2>
        <button class="primary-btn" @click="toggleUploader">
          {{ showUploader ? 'アップロード領域を閉じる' : 'アップロード' }}
        </button>
      </div>

      <transition name="fade">
        <div
          v-if="showUploader"
          class="upload-area"
          @dragover.prevent
          @drop.prevent="handleDrop"
        >
          <p class="upload-instruction">ここにPDFファイルをドラッグ&ドロップしてください</p>

          <ul v-if="droppedFiles.length > 0" class="file-list">
            <li v-for="file in droppedFiles" :key="file.name" class="file-item">
              {{ file.name }}
            </li>
          </ul>

          <p v-if="errorMessage" class="error">{{ errorMessage }}</p>

          <div class="upload-actions">
            <button class="primary-btn" @click="uploadFiles" :disabled="droppedFiles.length === 0">
              アップロード実行
            </button>
          </div>
          <p class="demo-note" v-if="IS_DEMO">
            ※ デモ用システムのため実際のアップロードは行われません
          </p>
        </div>
      </transition>
    </div>

    <!-- 読み込み中表示 -->
    <LoadingSpinner v-if="isLoading" />

    <!-- 一覧 -->
    <div v-else>
      <div v-if="announcements.length > 0" class="table-wrapper">
        <table class="announcement-table" role="table" aria-label="周知事項PDF一覧">
          <thead>
            <tr>
              <th scope="col">ファイル名</th>
              <th v-if="isAdmin" scope="col" class="col-action">削除</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="file in announcements" :key="file.name">
              <td class="file-name" :title="file.name">
                <a :href="file.url" target="_blank" rel="noopener">{{ file.name }}</a>
              </td>
              <td v-if="isAdmin" class="col-action">
                <button class="danger-btn" @click="deleteFile(file.name)">削除</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div v-else class="no-data-card">
        今は表示できるPDFはありません
      </div>
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
const IS_DEMO = import.meta.env.VITE_DEMO_FLAG === 'true'

const isAdmin = ref(false)
const uid = ref<string | null>(null)
const announcements = ref<{ name: string; url: string }[]>([])
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
  if (IS_DEMO) {
    alert('デモ用システムのためアップロードはできません')
    return
  }

  const existingSet = new Set(announcements.value.map((file) => file.name))
  const duplicated = droppedFiles.value.find((file) => existingSet.has(file.name))

  if (duplicated) {
    errorMessage.value = '既存のPDFファイルと同名のファイルはアップロードできません'
    return
  }

  const formData = new FormData()
  droppedFiles.value.forEach((file) => formData.append('files', file))

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
  if (IS_DEMO) {
    alert('デモ用システムのため削除はできません')
    return
  }
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
/* ===== ページ全体（ユーザー管理と統一トーン） ===== */
.announcement-page {
  padding: 2rem;
  max-width: 960px;
  margin: 0 auto;
  color: #0f172a;
  -webkit-font-smoothing: antialiased;
  text-rendering: optimizeLegibility;
}

.page-title {
  font-size: 1.9rem;
  display: flex;
  align-items: center;
  gap: 0.6rem;
  font-weight: 800;
  margin-bottom: 1rem;
  color: #0f172a;
}
.icon {
  width: 1.7rem;
  height: 1.7rem;
  stroke: #0f172a;
}

/* ===== アップローダー（カード風・統一トーン） ===== */
.uploader-card {
  border: 1px solid #cbd5e1;
  border-radius: 10px;
  background: #ffffff;
  padding: 1rem;
  margin-bottom: 1rem;
  box-shadow:
    0 1px 1px rgba(15, 23, 42, 0.04),
    0 4px 12px rgba(15, 23, 42, 0.06);
}
.uploader-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.uploader-header h2 {
  font-size: 1.1rem;
  font-weight: 700;
  margin: 0;
}

.upload-area {
  border: 2px dashed #94a3b8;
  padding: 1rem;
  margin-top: 0.75rem;
  background-color: #f8fafc;
  text-align: center;
  border-radius: 10px;
}
.upload-instruction {
  margin: 0.25rem 0 0.5rem;
}
.file-list {
  text-align: left;
  margin-top: 0.75rem;
  padding-left: 1rem;
}
.file-item {
  list-style: disc;
}
.error {
  color: #dc2626;
  margin-top: 0.5rem;
  font-weight: 600;
}
.upload-actions {
  margin-top: 0.75rem;
  display: flex;
  justify-content: center;
}
.demo-note {
  margin-top: 0.5rem;
  color: #64748b;
  font-size: 0.9rem;
}

/* 統一ボタンスタイル */
.primary-btn {
  padding: 0.55rem 1rem;
  background-color: #1e3a8a;
  color: white;
  border: 1px solid #1e3a8a;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 700;
}
.primary-btn:hover { filter: brightness(1.05); }
.primary-btn:disabled { opacity: 0.6; cursor: not-allowed; }

.danger-btn {
  background-color: #dc2626;
  color: #fff;
  border: none;
  border-radius: 8px;
  padding: 0.45rem 0.9rem;
  cursor: pointer;
  font-weight: 700;
}
.danger-btn:hover { background-color: #b91c1c; }

/* ===== テーブル（ユーザー管理と同トーン・くっきり） ===== */
.table-wrapper {
  width: 100%;
  overflow: auto;
  border: 1px solid #cbd5e1; /* 外枠でくっきり */
  border-radius: 10px;
  background: #ffffff;
  box-shadow:
    0 1px 1px rgba(15, 23, 42, 0.04),
    0 4px 12px rgba(15, 23, 42, 0.06);
}

.announcement-table {
  width: 100%;
  border-collapse: separate; /* separateで罫線を強調 */
  border-spacing: 0;
  font-size: 0.95rem;
  color: #0f172a;
  min-width: 520px;
}

.announcement-table thead th {
  position: sticky; /* スクロールしてもヘッダー固定 */
  top: 0;
  z-index: 1;
  background: #edf2ff; /* ほんのり濃い見出し */
  text-align: left;
  font-weight: 700;
  padding: 12px 14px;
  border-bottom: 2px solid #94a3b8; /* 下線を太めに */
  border-right: 1px solid #e2e8f0;   /* 縦線 */
  white-space: nowrap;
}
.announcement-table thead th:last-child {
  border-right: none;
}

.announcement-table th,
.announcement-table td {
  padding: 12px 14px;
  border-bottom: 1px solid #e2e8f0;  /* セル下線を明確に */
  border-right: 1px solid #e2e8f0;   /* 縦線 */
  text-align: left;                  /* 左寄せ */
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.announcement-table th:last-child,
.announcement-table td:last-child {
  border-right: none; /* 最後の列は縦線なし */
}

/* ゼブラ＋ホバー */
.announcement-table tbody tr:nth-child(odd) {
  background: #f8fafc;
}
.announcement-table tbody tr:hover {
  background: #e8f0ff;
}

/* 列幅の目安（ファイル名は広め） */
.announcement-table td:first-child {
  min-width: 340px;
}
.col-action {
  min-width: 120px;
  text-align: left; /* ボタン列も左寄せで統一 */
}

/* ファイルリンク */
.announcement-table .file-name a {
  color: #2563eb;
  text-decoration: none;
}
.announcement-table .file-name a:hover {
  text-decoration: underline;
}

/* データなしカード（統一トーン） */
.no-data-card {
  margin-top: 1rem;
  border: 1px solid #cbd5e1;
  border-radius: 10px;
  background: #ffffff;
  padding: 1rem;
  text-align: center;
  color: #64748b;
  font-weight: 600;
  box-shadow:
    0 1px 1px rgba(15, 23, 42, 0.04),
    0 4px 12px rgba(15, 23, 42, 0.06);
}

/* フェード（アップローダー開閉用） */
.fade-enter-from, .fade-leave-to { opacity: 0; }
.fade-enter-active, .fade-leave-active { transition: opacity 0.2s ease; }

/* ===== スマホ最適化（あなたの方針を踏襲） ===== */
@media (max-width: 600px) {
  .table-wrapper {
    transform: scale(0.7);
    transform-origin: top left;
  }
  .page-title {
    font-size: 1.5rem;
  }
  .uploader-card {
    transform: scale(0.95);
    transform-origin: top left;
  }
}
</style>
