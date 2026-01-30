<template>
  <div class="login-wrapper">
    <div class="login-card">
      <h1 class="login-title">TMT 勤怠管理システム</h1>

      <form @submit.prevent="handleLogin" class="login-form">
        <div class="form-group">
          <label for="email">メールアドレス</label>
          <input
            id="email"
            type="email"
            v-model="email"
            required
            placeholder="example@mail.com"
            autocomplete="username"
          />
        </div>

        <div class="form-group">
          <label for="password">パスワード</label>
          <input
            id="password"
            type="password"
            v-model="password"
            required
            placeholder="パスワードを入力"
            autocomplete="current-password"
          />
        </div>

        <button type="submit" :disabled="loading">
          {{ loading ? 'ログイン中...' : 'ログイン' }}
        </button>

        <!-- ✅ メッセージ枠は常に確保し、長文でも高さが変わりにくいようにする -->
        <p class="error-message" aria-live="polite">
          {{ error || '　' }}
        </p>

        <p class="register-link">
          アカウントをお持ちでない方は
          <button
            type="button"
            class="link-button"
            @click="handleRegister"
          >
            新規登録
          </button>
        </p>

        <!-- ✅ デモ案内（新規登録の下） -->
        <div v-if="IS_DEMO" class="demo-info" aria-label="デモ環境ログイン情報">
          <p class="demo-title">ログインは以下のユーザーをご利用ください。</p>

          <div class="demo-box">
            <p class="demo-label">■管理者ユーザー</p>
            <p class="demo-cred">TMT_Admin@example.com</p>
            <p class="demo-cred">AdminTest99</p>

            <p class="demo-label demo-mt">■一般ユーザー</p>
            <p class="demo-cred">TMT_User@example.com</p>
            <p class="demo-cred">UserTest99</p>

            <p class="demo-label demo-mt">システム説明書(GitHubURL)</p>
            <a
              class="demo-link"
              href="https://github.com/TMT-program/attendance-system"
              target="_blank"
              rel="noopener noreferrer"
            >
              https://github.com/TMT-program/attendance-system
            </a>
          </div>
        </div>

      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, onBeforeUnmount, ref } from 'vue'
import { useRouter } from 'vue-router'
import axios from 'axios'

import { auth, db } from '../firebase'
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
} from 'firebase/auth'
import { doc, getDoc } from 'firebase/firestore'

/* =========================
 * 環境変数
 * ========================= */
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL
const IS_DEMO = import.meta.env.VITE_DEMO_FLAG === 'true'

/* =========================
 * 状態
 * ========================= */
const email = ref('')
const password = ref('')
const loading = ref(false)
const error = ref('')
const router = useRouter()

/* =========================
 * ライフサイクル
 * ========================= */
onMounted(() => {
  // ✅ body 自体はスクロールさせず、login-wrapper 内でスクロールさせる
  document.documentElement.classList.add('no-scroll')
  document.body.classList.add('no-scroll')

  // ✅ 初期表示時にウォームアップ
  warmupFirebase()
  warmupBackend()
})

onBeforeUnmount(() => {
  document.documentElement.classList.remove('no-scroll')
  document.body.classList.remove('no-scroll')
})

/* =========================
 * Firebase warmup
 * ========================= */
let firebaseWarmedUp = false

async function warmupFirebase() {
  if (firebaseWarmedUp) return
  firebaseWarmedUp = true

  try {
    // Auth 初期化を促す
    await new Promise<void>((resolve) => {
      const unsub = onAuthStateChanged(auth, () => {
        unsub()
        resolve()
      })
    })

    // Firestore に軽いアクセス（存在しないドキュメントでもOK）
    await getDoc(doc(db, '__warmup__', 'ping'))
  } catch (e) {
    console.debug('[warmup] firebase skipped/failed:', e)
  }
}

/* =========================
 * Backend warmup
 * ========================= */
let backendWarmedUp = false

async function warmupBackend() {
  if (backendWarmedUp) return
  backendWarmedUp = true

  try {
    await axios.get(`${API_BASE_URL}/api/info/health`, {
      params: { t: Date.now() },
      timeout: 8000,
    })
  } catch (e) {
    console.debug('[warmup] backend skipped/failed:', e)
  }
}

/* =========================
 * ログイン
 * ========================= */
async function handleLogin() {
  error.value = ''
  loading.value = true

  try {
    await signInWithEmailAndPassword(auth, email.value, password.value)

    // 念のためログイン直後にも backend warmup
    warmupBackend()

    router.push('/menu')
  } catch (e) {
    error.value =
      'ログインに失敗しました。メールアドレスとパスワードを確認してください。'
  } finally {
    loading.value = false
  }
}

/* =========================
 * 新規登録
 * ========================= */
async function handleRegister() {
  error.value = ''

  if (IS_DEMO) {
    error.value = 'デモ用システムのため新規登録機能は無効にしています。'
    return
  }

  loading.value = true
  try {
    await createUserWithEmailAndPassword(auth, email.value, password.value)

    warmupBackend()

    router.push('/menu')
  } catch (e) {
    error.value =
      '登録に失敗しました。メールアドレスとパスワードの形式を確認してください。'
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
*,
*::before,
*::after {
  box-sizing: border-box;
}

.login-wrapper {
  /* ✅ iOS Safariの高さズレ対策：min-heightで保険 */
  min-height: 100vh;
  height: 100dvh;
  width: 100%;

  /* ✅ セーフエリアを考慮して上を少し余分に確保 */
  padding: calc(16px + env(safe-area-inset-top)) 16px 16px;

  background-color: #f8fafc;

  display: flex;
  justify-content: center;

  /* ✅ 見切れ防止：基本は中央寄せでも、上が詰まりやすい端末で上寄せに */
  align-items: center;

  overflow-y: auto;
  overflow-x: hidden;
  -webkit-overflow-scrolling: touch;

  -ms-overflow-style: none;
  scrollbar-width: none;
}

.login-wrapper::-webkit-scrollbar {
  display: none;
}

/* ✅ 高さが厳しい端末（iPhone含む）では上寄せにして見切れを確実に防ぐ */
@media (max-height: 820px) {
  .login-wrapper {
    align-items: flex-start;
  }
}



.login-card {
  background-color: #ffffff;
  padding: 2.5rem;
  border-radius: 12px;
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.1);
  width: 100%;
  max-width: 420px;
  border: 1px solid #d1d5db;

  /* ✅ 高さが足りない時も card が見切れにくい */
  margin: 12px 0;
}

.login-title {
  text-align: center;
  font-size: 1.8rem;
  font-weight: bold;
  color: #1e3a8a;
  margin-bottom: 2rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.login-form {
  max-width: 320px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.form-group {
  width: 100%;
  margin-bottom: 1.2rem;
}

label {
  display: block;
  text-align: center;
  margin-bottom: 0.5rem;
  font-weight: 600;
  color: #1e293b;
}

input {
  width: 100%;
  padding: 0.6rem;
  font-size: 1rem;
  border: 1px solid #94a3b8;
  border-radius: 6px;
}

input:focus {
  border-color: #2563eb;
  outline: none;
}

button[type='submit'] {
  width: 100%;
  padding: 0.75rem;
  background-color: #2563eb;
  color: white;
  font-weight: bold;
  font-size: 1rem;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  margin-top: 0.2rem;
}

button[type='submit']:hover:not(:disabled) {
  background-color: #1d4ed8;
}

button[type='submit']:disabled {
  background-color: #93c5fd;
  cursor: not-allowed;
}

/* ✅ ここが肝：エラーメッセージ表示で高さが変わらないように、2行分を確保 */
.error-message {
  width: 100%;
  min-height: calc(1.5em * 2); /* 2行分確保 */
  margin-top: 1rem;
  color: #dc2626;
  font-weight: bold;
  text-align: center;
  padding: 0 0.5rem;
  line-height: 1.5;
  display: flex;
  align-items: center;
  justify-content: center;

  overflow: hidden;
  word-break: break-word;
}

.register-link {
  margin-top: 1.5rem;
  text-align: center;
  font-size: 0.9rem;
  color: #475569;
}

/* リンク風ボタン */
.link-button {
  background: none;
  border: none;
  color: #2563eb;
  font-weight: bold;
  text-decoration: underline;
  cursor: pointer;
  margin-left: 0.4rem;
  padding: 0;
}

.link-button:hover {
  color: #1e40af;
}

.link-button:focus,
.link-button:focus-visible {
  outline: none;
  box-shadow: none;
}

/* ✅ デモ案内（新規登録の下） */
.demo-info {
  width: 100%;
  margin-top: 1.2rem;
}

.demo-title {
  font-size: 0.88rem;
  color: #334155;
  text-align: center;
  margin: 0 0 0.6rem;
  font-weight: 600;
}

.demo-box {
  border: 1px solid #cbd5e1;
  background: #f8fafc;
  border-radius: 10px;
  padding: 0.9rem 1rem;
}

.demo-label {
  margin: 0.35rem 0 0.25rem;
  font-size: 0.9rem;
  color: #0f172a;
  font-weight: 700;
}

.demo-mt {
  margin-top: 0.7rem;
}

.demo-cred {
  margin: 0;
  font-size: 0.9rem;
  color: #0f172a;
  font-weight: 600;
  line-height: 1.4;
  word-break: break-word;
}

.demo-link {
  display: inline-block;
  margin-top: 0.25rem;
  font-size: 0.88rem;
  color: #2563eb;
  text-decoration: underline;
  word-break: break-all;
}

.demo-link:hover {
  color: #1e40af;
}

/* ✅ 画面の高さが小さい端末では、中央寄せより「上寄せ」の方が見やすい */
@media (max-height: 740px) {
  .login-wrapper {
    align-items: flex-start;
    padding-top: 20px;
    padding-bottom: 20px;
  }

  .login-title {
    margin-bottom: 1.5rem;
  }
}

@media (max-width: 480px) {
  .login-card {
    padding: 1.5rem;
  }

  .login-title {
    font-size: 1.4rem;
    white-space: normal;
  }

  .demo-box {
    padding: 0.8rem 0.9rem;
  }

  .demo-title,
  .demo-label,
  .demo-cred,
  .demo-link {
    font-size: 0.85rem;
  }
}
</style>
