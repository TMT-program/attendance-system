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
          />
        </div>

        <button type="submit" :disabled="loading">
          {{ loading ? 'ログイン中...' : 'ログイン' }}
        </button>

        <p class="error-message">{{ error || '　' }}</p>

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
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100dvh;
  width: 100%;
  padding: 16px;
  background-color: #f8fafc;
  overflow: hidden;
}

.login-card {
  background-color: #ffffff;
  padding: 2.5rem;
  border-radius: 12px;
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.1);
  width: 100%;
  max-width: 420px;
  border: 1px solid #d1d5db;
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

.error-message {
  width: 100%;
  min-height: 1.5em;
  margin-top: 1rem;
  color: #dc2626;
  font-weight: bold;
  text-align: center;
  padding: 0 0.5rem;
}

.register-link {
  margin-top: 1.5rem;
  text-align: center;
  font-size: 0.9rem;
  color: #475569;
}

.link-button {
  background: none;
  border: none;
  color: #2563eb;
  font-weight: bold;
  text-decoration: underline;
  cursor: pointer;
  margin-left: 0.4rem;
}

.link-button:hover {
  color: #1e40af;
}

@media (max-width: 480px) {
  .login-card {
    padding: 1.5rem;
  }

  .login-title {
    font-size: 1.4rem;
    white-space: normal;
  }
}
</style>
