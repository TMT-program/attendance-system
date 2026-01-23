<template>
  <div class="login-wrapper">
    <div class="login-card">
      <h1 class="login-title">TMT 勤怠管理システム</h1>

      <form @submit.prevent="handleLogin" class="login-form">
        <div class="form-group">
          <label for="email">メールアドレス</label>
          <input id="email" type="email" v-model="email" required placeholder="example@mail.com" />
        </div>

        <div class="form-group">
          <label for="password">パスワード</label>
          <input id="password" type="password" v-model="password" required placeholder="パスワードを入力" />
        </div>

        <button type="submit" :disabled="loading">
          {{ loading ? 'ログイン中...' : 'ログイン' }}
        </button>

        <p class="error-message" v-show="true">{{ error || '　' }}</p>

        <p class="register-link">
          アカウントをお持ちでない方は
          <button type="button" class="link-button" @click="handleRegister">新規登録</button>
        </p>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { auth, db } from '../firebase'
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, onAuthStateChanged } from 'firebase/auth'
import { doc, getDoc } from 'firebase/firestore'

onMounted(() => {
  document.documentElement.classList.add('no-scroll')
  document.body.classList.add('no-scroll')

  // ✅ ログイン画面表示時にFirebaseを“軽く起こす”
  warmupFirebase()
})

onBeforeUnmount(() => {
  document.documentElement.classList.remove('no-scroll')
  document.body.classList.remove('no-scroll')
})

const IS_DEMO = import.meta.env.VITE_DEMO_FLAG === 'true'

const email = ref('')
const password = ref('')
const loading = ref(false)
const error = ref('')
const router = useRouter()

/**
 * ✅ Firebase “ウォームアップ”
 * - 失敗してもログインUIには影響させない（握りつぶし）
 * - 画面表示時に1回だけ走ればOK
 *
 * 方式:
 * 1) Authの初期化イベントを1回待つ（軽い）
 * 2) Firestoreを1回叩く（起動を促進）
 *
 * 注意:
 * - Firestoreのread権限が厳しいと getDoc が permission-denied になる可能性あり
 *   → その場合でも catch で握りつぶすので動作は止まらない
 *   → もし確実に成功させたいなら「誰でもread可のwarmupドキュメント」を用意すると良い
 */
let warmedUp = false
async function warmupFirebase() {
  if (warmedUp) return
  warmedUp = true

  try {
    // ① Auth初期化が走るきっかけになりやすい（onAuthStateChangedを1回だけ待って解除）
    await new Promise<void>((resolve) => {
      const unsub = onAuthStateChanged(auth, () => {
        unsub()
        resolve()
      })
    })

    // ② Firestoreに軽いアクセス（存在しないドキュメントでもOK）
    //    ※ ルール次第で permission-denied になることはある（その場合でもOK）
    await getDoc(doc(db, '__warmup__', 'ping'))
  } catch (e) {
    // ログには出すけど、UIには出さない（ログイン体験を壊さない）
    console.debug('[warmup] firebase warmup skipped/failed:', e)
  }
}

async function handleLogin() {
  error.value = ''
  loading.value = true
  try {
    await signInWithEmailAndPassword(auth, email.value, password.value)
    router.push('/menu')
  } catch (e: any) {
    error.value = 'ログインに失敗しました。メールアドレスとパスワードを確認してください。'
  } finally {
    loading.value = false
  }
}

async function handleRegister() {
  error.value = ''

  if (IS_DEMO) {
    error.value = 'デモ用システムのため新規登録機能は無効にしています。'
    return
  }

  loading.value = true
  try {
    await createUserWithEmailAndPassword(auth, email.value, password.value)
    router.push('/menu')
  } catch (e: any) {
    error.value = '登録に失敗しました。メールアドレスとパスワードの形式を確認してください。'
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

  box-sizing: border-box;
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

  overflow: hidden;
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
  width: 100%;
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
  width: 100%;
  text-align: center;
  margin-bottom: 0.5rem;
  font-weight: 600;
  color: #1e293b;
}

input {
  width: 100%;
  padding: 0.6rem;
  font-size: 1rem;
  display: block;
  border: 1px solid #94a3b8;
  border-radius: 6px;
  transition: border-color 0.3s ease;
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
  transition: background-color 0.3s ease;
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

  word-break: break-word;
  overflow-wrap: anywhere;
  white-space: normal;
  padding: 0 0.5rem;
}

.register-link {
  width: 100%;
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
  padding: 0;
  margin-left: 0.4rem;
  outline: none;
}

.link-button:focus {
  outline: none;
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
    text-align: center;
  }

  .login-form {
    max-width: 100%;
  }
}
</style>
