<template>
  <div class="ai-chat-container">
    <!-- タイトル -->
    <div class="header">
      <div class="title-area">
        <MessageCircle class="title-icon" />
        <h1 class="title">AIチャット</h1>
      </div>
    </div>

    <!-- 説明（控えめ） -->
    <div class="hint-card">
      <p class="hint-text">
        勤怠管理システムの使い方や入力ルールなどを質問できます。<br />
        ※個人情報やパスワードなど、機密情報は入力しないでください。
      </p>
    </div>

    <!-- チャット表示 -->
    <div class="chat-card" role="region" aria-label="AIチャット">
      <div ref="chatScrollRef" class="chat-area">
        <div
          v-for="m in messages"
          :key="m.id"
          class="msg-row"
          :class="m.role === 'user' ? 'is-user' : 'is-assistant'"
        >
          <div class="bubble">
            <div class="meta">
              <span class="role-label">
                {{ m.role === 'user' ? 'あなた' : 'AI' }}
              </span>
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
            <div class="text typing">入力中…</div>
          </div>
        </div>

        <div v-if="messages.length === 0" class="empty-state">
          <div class="empty-title">まずは質問してみましょう</div>
          <div class="empty-sub">
            例：勤務報告の提出条件は？ / 休暇の入力方法は？ / 管理者承認の流れは？
          </div>
        </div>
      </div>

      <!-- 入力エリア -->
      <div class="input-area">
        <textarea
          v-model="input"
          class="chat-input"
          placeholder="メッセージを入力（Enterで送信 / Shift+Enterで改行）"
          :disabled="isSending || isLimitReached"
          rows="2"
          @keydown.enter.exact.prevent="handleEnterSend"
          @keydown.enter.shift.exact.stop
          @input="onInput"
        />

        <button
          class="send-btn"
          :disabled="isSending || !canSend"
          @click="sendMessage"
        >
          <Send class="send-icon" />
          <span class="send-label">送信</span>
        </button>
      </div>

      <!-- ✅ 追加：ステータス/警告表示 -->
      <div class="status-area">
        <div class="status-left">
          <span class="status-item">
            残り回数：<b>{{ remainingChats }}</b> / {{ MAX_CHATS }}
          </span>
        </div>

        <div class="status-right">
          <span
            class="status-item"
            :class="isCharLimitReached ? 'is-danger' : ''"
          >
            {{ inputLength }} / {{ MAX_CHARS }}文字
          </span>
        </div>
      </div>

      <div v-if="errorMessage" class="error-text">
        {{ errorMessage }}
      </div>

      <div class="footer-note">
        ※個人情報やパスワードなど、機密情報は入力しないでください。
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, nextTick, onMounted, computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import axios from 'axios'
import { MessageCircle, Send, ArrowLeft } from 'lucide-vue-next'
// ✅ ログイン単位で回数リセットしたいので auth を使う
import { auth } from '../firebase'
import { onAuthStateChanged } from 'firebase/auth'

type ChatRole = 'user' | 'assistant'

type ChatMessage = {
  id: string
  role: ChatRole
  text: string
  time: string
}

type AIChatResponse = {
  text: string
}

const router = useRouter()

/** =========================
 * 制限値
 * ========================= */
const MAX_CHARS = 300
const MAX_CHATS = 10

/** =========================
 * 状態
 * ========================= */
const input = ref('')
const isSending = ref(false)
const chatScrollRef = ref<HTMLDivElement | null>(null)

const messages = ref<ChatMessage[]>([
  {
    id: crypto.randomUUID?.() ?? String(Date.now()),
    role: 'assistant',
    text: 'こんにちは。勤怠管理システムについて何でも聞いてください。',
    time: getTimeString(),
  },
])

/** ✅ 送信回数（1ログイン=10回） */
const sendCount = ref(0)

/** ✅ エラーメッセージ（赤文字表示） */
const errorMessage = ref('')

/** ✅ sessionStorageキー（ログイン中は保持、ログアウトでクリア） */
const CHAT_COUNT_KEY = 'ai_chat_send_count_v1'

/** =========================
 * computed
 * ========================= */
const inputLength = computed(() => input.value.length)
const isCharLimitReached = computed(() => inputLength.value >= MAX_CHARS)

const remainingChats = computed(() => Math.max(0, MAX_CHATS - sendCount.value))
const isLimitReached = computed(() => remainingChats.value <= 0)

/** 送信可能条件 */
const canSend = computed(() => {
  const text = input.value.trim()
  if (!text) return false
  if (isLimitReached.value) return false
  if (isSending.value) return false
  return true
})

/** =========================
 * utility
 * ========================= */
function getTimeString() {
  const d = new Date()
  return d.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })
}

function goBack() {
  router.push({ name: 'Menu' })
}

async function scrollToBottom() {
  await nextTick()
  const el = chatScrollRef.value
  if (!el) return
  el.scrollTop = el.scrollHeight
}

/** =========================
 * 入力制限（300文字超えさせない）
 * - 直接入力でも貼り付けでも必ずカット
 * ========================= */
function onInput() {
  if (input.value.length > MAX_CHARS) {
    input.value = input.value.slice(0, MAX_CHARS)
  }

  // 文字数エラー表示（上限到達時に赤で案内）
  if (input.value.length >= MAX_CHARS) {
    errorMessage.value = `入力できる文字数は${MAX_CHARS}文字までです。`
  } else {
    // 文字数関連のエラーだけ消す（回数制限のエラーは残したい）
    if (errorMessage.value.includes(`入力できる文字数は${MAX_CHARS}文字まで`)) {
      errorMessage.value = ''
    }
  }
}

function handleEnterSend() {
  // Enter単体は送信（Shift+Enterは改行）
  sendMessage()
}

/** =========================
 * 送信回数の永続化（ログイン中だけ）
 * ========================= */
function loadSendCountFromSession() {
  const raw = sessionStorage.getItem(CHAT_COUNT_KEY)
  const n = Number(raw)
  if (Number.isFinite(n) && n >= 0) {
    sendCount.value = n
  } else {
    sendCount.value = 0
  }
}

function saveSendCountToSession() {
  sessionStorage.setItem(CHAT_COUNT_KEY, String(sendCount.value))
}

function resetSendCountSession() {
  sessionStorage.removeItem(CHAT_COUNT_KEY)
  sendCount.value = 0
}

/** =========================
 * 送信処理
 * ========================= */
async function sendMessage() {
  // 回数制限
  if (isLimitReached.value) {
    errorMessage.value = `チャットの利用回数は1回のログインにつき${MAX_CHATS}回までです。`
    return
  }

  const text = input.value.trim()
  if (!text || isSending.value) return

  // 念のため（300文字超えは送らない）
  const trimmed = text.length > MAX_CHARS ? text.slice(0, MAX_CHARS) : text

  // ユーザー発言を追加
  messages.value.push({
    id: crypto.randomUUID?.() ?? String(Date.now() + Math.random()),
    role: 'user',
    text: trimmed,
    time: getTimeString(),
  })

  // ✅ 送信回数を加算（「送る」操作を10回まで、という要件なのでここでカウント）
  sendCount.value += 1
  saveSendCountToSession()

  input.value = ''
  await scrollToBottom()

  // 回数上限に到達したら案内（赤文字）
  if (isLimitReached.value) {
    errorMessage.value = `チャットの利用回数は1回のログインにつき${MAX_CHATS}回までです。`
  } else {
    // 回数系のエラーが出てたら消す（ただし文字数系は別処理）
    if (errorMessage.value.includes(`チャットの利用回数は1回のログインにつき${MAX_CHATS}回まで`)) {
      errorMessage.value = ''
    }
  }

  // ✅ 本物：バックエンド連携
  isSending.value = true
  try {
    const API_BASE = (import.meta.env.VITE_API_BASE_URL ?? '').toString().replace(/\/$/, '')
    if (!API_BASE) throw new Error('VITE_API_BASE_URL is not set')

    const { data } = await axios.post<AIChatResponse>(
      `${API_BASE}/api/ai/chat`,
      { message: trimmed }
    )

    messages.value.push({
      id: crypto.randomUUID?.() ?? String(Date.now() + Math.random()),
      role: 'assistant',
      text: (data?.text ?? '').toString(),
      time: getTimeString(),
    })
  } catch (err: any) {
    console.error('[AIChat] request failed:', err)

    const message =
      err?.response?.data?.error ||
      err?.message ||
      '通信に失敗しました。時間をおいて再度お試しください。'

    messages.value.push({
      id: crypto.randomUUID?.() ?? String(Date.now() + Math.random()),
      role: 'assistant',
      text: `エラー：${message}`,
      time: getTimeString(),
    })
  } finally {
    isSending.value = false
    await scrollToBottom()
  }
}

/** =========================
 * mounted / auth
 * ========================= */
onMounted(() => {
  scrollToBottom()

  // ✅ ログイン中は回数を保持、ログアウト/ログインし直しでリセット
  onAuthStateChanged(auth, (user) => {
    if (user) {
      loadSendCountFromSession()
    } else {
      // ログアウトしたらリセット
      resetSendCountSession()
      errorMessage.value = ''
      input.value = ''
    }
  })
})

/** sessionStorageを使うので安全のために監視 */
watch(sendCount, () => {
  saveSendCountToSession()
})
</script>

<style scoped>
.ai-chat-container {
  padding: 2rem;
  max-width: 980px;
  margin: 0 auto;
  font-family: 'Segoe UI', sans-serif;
}

/* ヘッダー */
.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 1rem;
}

.title-area {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  min-width: 0;
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
  line-height: 1.1;
  white-space: nowrap;
}

.back-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  border: 1px solid #cbd5e1;
  background: #ffffff;
  color: #334155;
  padding: 0.55rem 0.75rem;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.06);
}

.back-btn:hover {
  background: #f8fafc;
  transform: translateY(-1px);
}

.back-icon {
  width: 1.2rem;
  height: 1.2rem;
}

.back-label {
  font-weight: 700;
  font-size: 0.95rem;
}

/* ヒントカード */
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

/* チャットカード */
.chat-card {
  border: 2px solid #1e3a8a;
  border-radius: 14px;
  background: #ffffff;
  box-shadow: 0 6px 18px rgba(0, 0, 0, 0.08);
  overflow: hidden;
}

/* チャット領域 */
.chat-area {
  position: relative;
  height: 520px;
  padding: 1rem;
  overflow-y: auto;
  background: linear-gradient(180deg, #ffffff 0%, #f8fafc 100%);
}

/* 空状態 */
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
  max-width: 720px;
}

/* メッセージ行 */
.msg-row {
  display: flex;
  margin-bottom: 0.8rem;
}

.msg-row.is-user {
  justify-content: flex-end;
}

.msg-row.is-assistant {
  justify-content: flex-start;
}

.bubble {
  max-width: min(760px, 92%);
  border-radius: 14px;
  padding: 0.75rem 0.85rem;
  border: 1px solid #e2e8f0;
  background: #ffffff;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.06);
}

.msg-row.is-user .bubble {
  border-color: #bfdbfe;
  background: #eff6ff;
}

.msg-row.is-assistant .bubble {
  border-color: #e2e8f0;
  background: #ffffff;
}

.meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  margin-bottom: 0.35rem;
}

.role-label {
  font-size: 0.85rem;
  font-weight: 900;
  color: #1e3a8a;
}

.msg-row.is-user .role-label {
  color: #0f172a;
}

.time {
  font-size: 0.78rem;
  color: #64748b;
}

.text {
  white-space: pre-wrap;
  word-break: break-word;
  color: #0f172a;
  font-size: 1rem;
  line-height: 1.6;
  text-align: left;
}

.typing {
  color: #64748b;
  font-weight: 700;
}

/* 入力エリア */
.input-area {
  display: flex;
  gap: 0.75rem;
  padding: 0.9rem;
  border-top: 1px solid #e2e8f0;
  background: #ffffff;
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
  background: #ffffff;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.18);
}

/* ✅ 追加：ステータス表示（文字数/残り回数） */
.status-area {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  padding: 0.55rem 0.9rem;
  border-top: 1px solid #e2e8f0;
  background: #ffffff;
}

.status-item {
  font-size: 0.85rem;
  color: #64748b;
}

.status-item.is-danger {
  color: #dc2626; /* 赤 */
  font-weight: 900;
}

/* ✅ 追加：赤文字のエラー */
.error-text {
  padding: 0.1rem 0.9rem 0.75rem;
  background: #ffffff;
  color: #dc2626;
  font-weight: 900;
  font-size: 0.9rem;
}

.send-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.45rem;
  min-width: 110px;
  border: 2px solid #1e3a8a;
  background: #1e3a8a;
  color: #ffffff;
  font-weight: 900;
  padding: 0.75rem 0.85rem;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.08);
}

.send-btn:hover {
  transform: translateY(-1px);
  background: #1d4ed8;
  border-color: #1d4ed8;
}

.send-btn:disabled {
  opacity: 0.55;
  cursor: not-allowed;
  transform: none;
}

.send-icon {
  width: 1.1rem;
  height: 1.1rem;
}

.send-label {
  font-size: 0.95rem;
  letter-spacing: 0.02em;
}

/* フッター注意 */
.footer-note {
  padding: 0.6rem 0.9rem;
  border-top: 1px solid #e2e8f0;
  background: #f8fafc;
  color: #64748b;
  font-size: 0.85rem;
  line-height: 1.4;
}

/* レスポンシブ（スマホ） */
@media (max-width: 600px) {
  .ai-chat-container {
    padding: 1rem;
  }

  .title {
    font-size: 1.7rem;
  }

  .chat-area {
    height: 460px;
    padding: 0.85rem;
  }

  .input-area {
    flex-direction: column;
    gap: 0.6rem;
  }

  .send-btn {
    width: 100%;
  }

  .back-label {
    display: none; /* スマホは文字省略して横崩れ防止 */
  }

  .status-area {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.25rem;
  }
}
</style>
