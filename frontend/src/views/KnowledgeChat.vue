<template>
  <div class="knowledge-chat-container">
    <div class="header">
      <div class="title-area">
        <BookOpen class="title-icon" />
        <h1 class="title">社内ナレッジ回答</h1>
      </div>
    </div>

    <div class="hint-card">
      <p class="hint-text">
        社内ナレッジに登録された情報をもとにAIが回答します。<br />
        ※登録されていない内容については回答できません。
      </p>
    </div>

    <div class="chat-card" role="region" aria-label="社内ナレッジ回答">
      <div ref="chatScrollRef" class="chat-area">
        <div
          v-for="m in messages"
          :key="m.id"
          class="msg-row"
          :class="m.role === 'user' ? 'is-user' : 'is-assistant'"
        >
          <div class="bubble">
            <div class="meta">
              <span class="role-label">{{ m.role === 'user' ? 'あなた' : 'AI' }}</span>
              <span class="time">{{ m.time }}</span>
            </div>
            <div class="text" v-text="m.text"></div>
          </div>
        </div>

        <div v-if="isSending" class="msg-row is-assistant">
          <div class="bubble">
            <div class="meta">
              <span class="role-label">AI</span>
              <span class="time">…</span>
            </div>
            <div class="text typing">検索中…</div>
          </div>
        </div>

        <div v-if="messages.length === 0" class="empty-state">
          <div class="empty-title">社内ナレッジに質問してみましょう</div>
          <div class="empty-sub">
            例：有給申請の手順は？ / 残業申請はいつまで？ / 経費精算のルールは？
          </div>
        </div>
      </div>

      <div class="input-area">
        <textarea
          v-model="input"
          class="chat-input"
          placeholder="質問を入力（Enterで送信 / Shift+Enterで改行）"
          :disabled="isSending"
          rows="2"
          @keydown.enter.exact.prevent="sendMessage"
          @keydown.enter.shift.exact.stop
          @input="onInput"
        />
        <button class="send-btn" :disabled="isSending || !canSend" @click="sendMessage">
          <Send class="send-icon" />
          <span class="send-label">送信</span>
        </button>
      </div>

      <div class="status-area">
        <span class="status-item" :class="isCharLimitReached ? 'is-danger' : ''">
          {{ inputLength }} / {{ MAX_CHARS }}文字
        </span>
      </div>

      <div v-if="errorMessage" class="error-text">{{ errorMessage }}</div>

      <div class="footer-note">
        ※社内ナレッジに登録された情報のみ回答します。
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, nextTick } from 'vue'
import api from '../api'
import { BookOpen, Send } from 'lucide-vue-next'

type ChatRole = 'user' | 'assistant'
type ChatMessage = { id: string; role: ChatRole; text: string; time: string }

const MAX_CHARS = 300

const input = ref('')
const isSending = ref(false)
const errorMessage = ref('')
const messages = ref<ChatMessage[]>([])
const chatScrollRef = ref<HTMLDivElement | null>(null)

const inputLength = computed(() => input.value.length)
const isCharLimitReached = computed(() => inputLength.value >= MAX_CHARS)
const canSend = computed(() => !!input.value.trim() && !isSending.value)

function getTimeString() {
  return new Date().toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })
}

function onInput() {
  if (input.value.length > MAX_CHARS) {
    input.value = input.value.slice(0, MAX_CHARS)
  }
  errorMessage.value = input.value.length >= MAX_CHARS
    ? `入力できる文字数は${MAX_CHARS}文字までです。`
    : ''
}

async function scrollToBottom() {
  await nextTick()
  const el = chatScrollRef.value
  if (el) el.scrollTop = el.scrollHeight
}

async function sendMessage() {
  const text = input.value.trim()
  if (!text || isSending.value) return

  const trimmed = text.length > MAX_CHARS ? text.slice(0, MAX_CHARS) : text
  messages.value.push({
    id: crypto.randomUUID?.() ?? String(Date.now()),
    role: 'user',
    text: trimmed,
    time: getTimeString(),
  })
  input.value = ''
  await scrollToBottom()

  isSending.value = true
  try {
    const { data } = await api.post<{ text: string }>('/api/knowledge/chat', { message: trimmed })

    messages.value.push({
      id: crypto.randomUUID?.() ?? String(Date.now() + Math.random()),
      role: 'assistant',
      text: data?.text ?? '（回答を取得できませんでした）',
      time: getTimeString(),
    })
  } catch (err: any) {
    const msg = err?.response?.data?.error || err?.message || '通信に失敗しました。'
    messages.value.push({
      id: crypto.randomUUID?.() ?? String(Date.now() + Math.random()),
      role: 'assistant',
      text: `エラー：${msg}`,
      time: getTimeString(),
    })
  } finally {
    isSending.value = false
    await scrollToBottom()
  }
}
</script>

<style scoped>
.knowledge-chat-container {
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
  margin-bottom: 1rem;
}

.hint-text {
  margin: 0;
  color: #475569;
  font-size: 0.95rem;
  line-height: 1.5;
}

.chat-card {
  border: 2px solid #1e3a8a;
  border-radius: 14px;
  background: #fff;
  box-shadow: 0 6px 18px rgba(0, 0, 0, 0.08);
  overflow: hidden;
}

.chat-area {
  position: relative;
  height: 520px;
  padding: 1rem;
  overflow-y: auto;
  background: linear-gradient(180deg, #fff 0%, #f8fafc 100%);
}

.empty-state {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 2rem;
  text-align: center;
  pointer-events: none;
}

.empty-title {
  font-weight: 900;
  color: #1e3a8a;
  font-size: 1.15rem;
  margin-bottom: 0.3rem;
}

.empty-sub {
  color: #64748b;
  font-size: 0.95rem;
  line-height: 1.5;
}

.msg-row {
  display: flex;
  margin-bottom: 0.8rem;
}

.msg-row.is-user { justify-content: flex-end; }
.msg-row.is-assistant { justify-content: flex-start; }

.bubble {
  max-width: min(760px, 92%);
  border-radius: 14px;
  padding: 0.75rem 0.85rem;
  border: 1px solid #e2e8f0;
  background: #fff;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.06);
}

.msg-row.is-user .bubble { border-color: #bfdbfe; background: #eff6ff; }
.msg-row.is-assistant .bubble { border-color: #e2e8f0; background: #fff; }

.meta {
  display: flex;
  justify-content: space-between;
  gap: 0.75rem;
  margin-bottom: 0.35rem;
}

.role-label { font-size: 0.85rem; font-weight: 900; color: #1e3a8a; }
.msg-row.is-user .role-label { color: #0f172a; }
.time { font-size: 0.78rem; color: #64748b; }

.text {
  white-space: pre-wrap;
  word-break: break-word;
  color: #0f172a;
  font-size: 1rem;
  line-height: 1.6;
  text-align: left;
}

.typing { color: #64748b; font-weight: 700; }

.input-area {
  display: flex;
  gap: 0.75rem;
  padding: 0.9rem;
  border-top: 1px solid #e2e8f0;
  background: #fff;
}

.chat-input {
  flex: 1;
  resize: none;
  border: 1px solid #cbd5e1;
  border-radius: 12px;
  padding: 0.75rem 0.85rem;
  font-size: 1rem;
  outline: none;
  color: #0f172a;
  line-height: 1.45;
  background: #f8fafc;
}

.chat-input:focus {
  border-color: #93c5fd;
  background: #fff;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.18);
}

.send-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.45rem;
  min-width: 110px;
  border: 2px solid #1e3a8a;
  background: #1e3a8a;
  color: #fff;
  font-weight: 900;
  padding: 0.75rem 0.85rem;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.send-btn:hover { background: #1d4ed8; border-color: #1d4ed8; transform: translateY(-1px); }
.send-btn:disabled { opacity: 0.55; cursor: not-allowed; transform: none; }
.send-icon { width: 1.1rem; height: 1.1rem; }
.send-label { font-size: 0.95rem; }

.status-area {
  padding: 0.55rem 0.9rem;
  border-top: 1px solid #e2e8f0;
  background: #fff;
  display: flex;
  justify-content: flex-end;
}

.status-item { font-size: 0.85rem; color: #64748b; }
.status-item.is-danger { color: #dc2626; font-weight: 900; }

.error-text {
  padding: 0.1rem 0.9rem 0.75rem;
  background: #fff;
  color: #dc2626;
  font-weight: 900;
  font-size: 0.9rem;
}

.footer-note {
  padding: 0.6rem 0.9rem;
  border-top: 1px solid #e2e8f0;
  background: #f8fafc;
  color: #64748b;
  font-size: 0.85rem;
}

@media (max-width: 600px) {
  .knowledge-chat-container { padding: 1rem; }
  .title { font-size: 1.7rem; }
  .chat-area { height: 460px; padding: 0.85rem; }
  .input-area { flex-direction: column; gap: 0.6rem; }
  .send-btn { width: 100%; }
}
</style>
