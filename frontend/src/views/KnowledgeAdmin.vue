<template>
  <div class="knowledge-admin-container">
    <div class="header">
      <div class="title-area">
        <Database class="title-icon" />
        <h1 class="title">ナレッジ管理</h1>
      </div>
    </div>

    <div class="hint-card">
      <p class="hint-text">
        .txt / .md ファイルをアップロードして社内ナレッジを登録できます（管理者専用）。<br />
        登録されたナレッジは「社内ナレッジ回答」でAIが参照します。
      </p>
    </div>

    <!-- アップロードフォーム -->
    <div class="upload-card">
      <h2 class="section-title">ナレッジ登録</h2>

      <div class="form-row">
        <label class="form-label">タイトル（任意）</label>
        <input
          v-model="uploadTitle"
          type="text"
          class="form-input"
          placeholder="例：有給申請ルール"
          :disabled="isUploading"
        />
      </div>

      <div class="form-row">
        <label class="form-label">ファイル（.txt / .md）</label>
        <div
          class="drop-zone"
          :class="{ 'is-over': isDragOver, 'is-disabled': isUploading }"
          @dragover.prevent="isDragOver = true"
          @dragleave="isDragOver = false"
          @drop.prevent="onDrop"
          @click="fileInputRef?.click()"
        >
          <Upload class="drop-icon" />
          <span v-if="selectedFile" class="drop-filename">{{ selectedFile.name }}</span>
          <span v-else class="drop-hint">クリックまたはドラッグ＆ドロップ</span>
        </div>
        <input
          ref="fileInputRef"
          type="file"
          accept=".txt,.md,text/plain,text/markdown"
          class="hidden-input"
          @change="onFileChange"
        />
      </div>

      <div v-if="uploadError" class="upload-error">{{ uploadError }}</div>

      <button
        class="upload-btn"
        :disabled="!selectedFile || isUploading"
        @click="uploadFile"
      >
        <span v-if="isUploading">登録中…</span>
        <span v-else>登録する</span>
      </button>

      <div v-if="uploadSuccess" class="upload-success">{{ uploadSuccess }}</div>
    </div>

    <!-- ナレッジ一覧 -->
    <div class="list-card">
      <h2 class="section-title">登録済みナレッジ一覧</h2>

      <div v-if="isLoadingList" class="loading-text">読み込み中…</div>

      <div v-else-if="knowledgeDocs.length === 0" class="empty-list">
        登録済みのナレッジはありません
      </div>

      <table v-else class="doc-table">
        <thead>
          <tr>
            <th>タイトル</th>
            <th>ファイル名</th>
            <th>登録日時</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="doc in knowledgeDocs" :key="doc.docId">
            <td>{{ doc.title }}</td>
            <td>{{ doc.originalname }}</td>
            <td>{{ formatDate(doc.uploadedAt) }}</td>
            <td class="action-cell">
              <button
                class="view-btn"
                @click="viewDoc(doc.docId)"
              >
                閲覧
              </button>
              <button
                class="delete-btn"
                :disabled="deletingDocId === doc.docId"
                @click="deleteDoc(doc.docId)"
              >
                {{ deletingDocId === doc.docId ? '削除中…' : '削除' }}
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>

  <!-- 閲覧モーダル -->
  <div v-if="isModalOpen" class="modal-overlay" @click.self="closeModal">
    <div class="modal">
      <div class="modal-header">
        <h3 class="modal-title">{{ modalTitle }}</h3>
        <button class="modal-close" @click="closeModal">✕</button>
      </div>
      <div class="modal-body">
        <div v-if="isLoadingContent" class="loading-text">読み込み中…</div>
        <pre v-else class="modal-content">{{ modalContent }}</pre>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import axios from 'axios'
import { Database, Upload } from 'lucide-vue-next'

type KnowledgeDoc = {
  docId: string
  title: string
  originalname: string
  uploadedAt: { _seconds: number } | null
}

const API_BASE = (import.meta.env.VITE_API_BASE_URL ?? '').toString().replace(/\/$/, '')

const uploadTitle = ref('')
const selectedFile = ref<File | null>(null)
const isUploading = ref(false)
const uploadError = ref('')
const uploadSuccess = ref('')
const isDragOver = ref(false)
const fileInputRef = ref<HTMLInputElement | null>(null)

const knowledgeDocs = ref<KnowledgeDoc[]>([])
const isLoadingList = ref(false)
const deletingDocId = ref('')

const isModalOpen = ref(false)
const isLoadingContent = ref(false)
const modalTitle = ref('')
const modalContent = ref('')

function onFileChange(e: Event) {
  const target = e.target as HTMLInputElement
  selectedFile.value = target.files?.[0] ?? null
  uploadError.value = ''
  uploadSuccess.value = ''
}

function onDrop(e: DragEvent) {
  isDragOver.value = false
  const file = e.dataTransfer?.files[0]
  if (!file) return
  if (!file.name.endsWith('.txt') && !file.name.endsWith('.md')) {
    uploadError.value = '.txt または .md ファイルのみ登録できます'
    return
  }
  selectedFile.value = file
  uploadError.value = ''
  uploadSuccess.value = ''
}

async function uploadFile() {
  if (!selectedFile.value) return
  uploadError.value = ''
  uploadSuccess.value = ''
  isUploading.value = true

  try {
    const formData = new FormData()
    formData.append('file', selectedFile.value)
    if (uploadTitle.value.trim()) {
      formData.append('title', uploadTitle.value.trim())
    }

    const { data } = await axios.post(`${API_BASE}/api/knowledge/upload`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })

    uploadSuccess.value = `「${data.title}」を登録しました`
    selectedFile.value = null
    uploadTitle.value = ''
    if (fileInputRef.value) fileInputRef.value.value = ''
    await loadList()
  } catch (err: any) {
    uploadError.value = err?.response?.data?.error || err?.message || '登録に失敗しました'
  } finally {
    isUploading.value = false
  }
}

async function loadList() {
  isLoadingList.value = true
  try {
    const { data } = await axios.get<KnowledgeDoc[]>(`${API_BASE}/api/knowledge/list`)
    knowledgeDocs.value = data
  } catch (err: any) {
    console.error('Failed to load knowledge list', err)
  } finally {
    isLoadingList.value = false
  }
}

async function deleteDoc(docId: string) {
  if (!confirm('このナレッジを削除しますか？')) return
  deletingDocId.value = docId
  try {
    await axios.delete(`${API_BASE}/api/knowledge/${docId}`)
    knowledgeDocs.value = knowledgeDocs.value.filter((d) => d.docId !== docId)
  } catch (err: any) {
    alert(err?.response?.data?.error || '削除に失敗しました')
  } finally {
    deletingDocId.value = ''
  }
}

async function viewDoc(docId: string) {
  isModalOpen.value = true
  isLoadingContent.value = true
  modalTitle.value = ''
  modalContent.value = ''
  try {
    const { data } = await axios.get(`${API_BASE}/api/knowledge/${docId}/content`)
    modalTitle.value = data.title
    modalContent.value = data.content
  } catch (err: any) {
    modalContent.value = '内容の取得に失敗しました'
  } finally {
    isLoadingContent.value = false
  }
}

function closeModal() {
  isModalOpen.value = false
}

function formatDate(uploadedAt: { _seconds: number } | null): string {
  if (!uploadedAt?._seconds) return '—'
  return new Date(uploadedAt._seconds * 1000).toLocaleString('ja-JP')
}

onMounted(() => {
  loadList()
})
</script>

<style scoped>
.knowledge-admin-container {
  padding: 2rem;
  max-width: 980px;
  margin: 0 auto;
  font-family: 'Segoe UI', sans-serif;
}

.header {
  display: flex;
  align-items: center;
  margin-bottom: 1rem;
}

.title-area {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.title-icon {
  width: 2.2rem;
  height: 2.2rem;
  color: #1e3a8a;
}

.title {
  font-size: 2.1rem;
  color: #1e3a8a;
  font-weight: 800;
  margin: 0;
}

.hint-card {
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  background: #f8fafc;
  padding: 0.9rem 1rem;
  margin-bottom: 1.5rem;
}

.hint-text {
  margin: 0;
  color: #475569;
  font-size: 0.95rem;
  line-height: 1.5;
}

.upload-card,
.list-card {
  border: 2px solid #1e3a8a;
  border-radius: 14px;
  background: #fff;
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.07);
  padding: 1.5rem;
  margin-bottom: 2rem;
}

.section-title {
  font-size: 1.2rem;
  font-weight: 800;
  color: #1e3a8a;
  margin: 0 0 1.2rem;
}

.form-row {
  margin-bottom: 1rem;
}

.form-label {
  display: block;
  font-size: 0.9rem;
  font-weight: 700;
  color: #334155;
  margin-bottom: 0.4rem;
}

.form-input {
  width: 100%;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  padding: 0.6rem 0.8rem;
  font-size: 1rem;
  outline: none;
  box-sizing: border-box;
}

.form-input:focus {
  border-color: #93c5fd;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.18);
}

.drop-zone {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  border: 2px dashed #93c5fd;
  border-radius: 12px;
  padding: 2rem;
  cursor: pointer;
  transition: background 0.2s;
  background: #f8fafc;
  min-height: 100px;
}

.drop-zone:hover,
.drop-zone.is-over {
  background: #eff6ff;
  border-color: #3b82f6;
}

.drop-zone.is-disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.drop-icon {
  width: 2rem;
  height: 2rem;
  color: #3b82f6;
}

.drop-hint {
  color: #64748b;
  font-size: 0.9rem;
}

.drop-filename {
  color: #1e3a8a;
  font-weight: 700;
  font-size: 0.95rem;
}

.hidden-input {
  display: none;
}

.upload-btn {
  margin-top: 1rem;
  padding: 0.7rem 2rem;
  background: #1e3a8a;
  color: #fff;
  border: none;
  border-radius: 10px;
  font-size: 1rem;
  font-weight: 700;
  cursor: pointer;
  transition: background 0.2s;
}

.upload-btn:hover {
  background: #1d4ed8;
}

.upload-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.upload-error {
  margin-top: 0.7rem;
  color: #dc2626;
  font-weight: 700;
  font-size: 0.9rem;
}

.upload-success {
  margin-top: 0.7rem;
  color: #16a34a;
  font-weight: 700;
  font-size: 0.9rem;
}

.loading-text {
  color: #64748b;
  font-size: 0.95rem;
}

.empty-list {
  color: #64748b;
  font-size: 0.95rem;
  text-align: center;
  padding: 1.5rem 0;
}

.doc-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.95rem;
}

.doc-table th {
  text-align: left;
  padding: 0.6rem 0.8rem;
  border-bottom: 2px solid #e2e8f0;
  color: #475569;
  font-weight: 700;
  white-space: nowrap;
}

.doc-table td {
  padding: 0.65rem 0.8rem;
  border-bottom: 1px solid #e2e8f0;
  color: #0f172a;
  word-break: break-all;
}

.delete-btn {
  padding: 0.35rem 0.8rem;
  background: #fff;
  color: #dc2626;
  border: 1.5px solid #dc2626;
  border-radius: 6px;
  font-size: 0.85rem;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s;
  white-space: nowrap;
}

.delete-btn:hover {
  background: #fef2f2;
}

.delete-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.action-cell {
  display: flex;
  gap: 0.5rem;
  align-items: center;
}

.view-btn {
  padding: 0.35rem 0.8rem;
  background: #fff;
  color: #1e3a8a;
  border: 1.5px solid #1e3a8a;
  border-radius: 6px;
  font-size: 0.85rem;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s;
  white-space: nowrap;
}

.view-btn:hover {
  background: #eff6ff;
}

.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.45);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal {
  background: #fff;
  border-radius: 14px;
  width: 90%;
  max-width: 700px;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.18);
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem 1.2rem;
  border-bottom: 1px solid #e2e8f0;
}

.modal-title {
  font-size: 1.1rem;
  font-weight: 800;
  color: #1e3a8a;
  margin: 0;
}

.modal-close {
  background: none;
  border: none;
  font-size: 1.2rem;
  color: #64748b;
  cursor: pointer;
  padding: 0.2rem 0.5rem;
  border-radius: 6px;
  transition: background 0.2s;
}

.modal-close:hover {
  background: #f1f5f9;
  color: #0f172a;
}

.modal-body {
  padding: 1.2rem;
  overflow-y: auto;
}

.modal-content {
  white-space: pre-wrap;
  word-break: break-word;
  font-family: 'Segoe UI', sans-serif;
  font-size: 0.92rem;
  color: #0f172a;
  line-height: 1.7;
  margin: 0;
  text-align: left;
}

@media (max-width: 600px) {
  .knowledge-admin-container { padding: 1rem; }
  .title { font-size: 1.7rem; }
  .doc-table { font-size: 0.82rem; }
}
</style>
