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
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { auth } from '../firebase'
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth'

const IS_DEMO = import.meta.env.VITE_DEMO_FLAG === 'true'

const email = ref('')
const password = ref('')
const loading = ref(false)
const error = ref('')
const router = useRouter()

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

  // デモモード時は登録機能を無効化
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
/* scoped内で幅計算のズレをなくす（左右余白が均等に見えるようにする） */
*,
*::before,
*::after {
  box-sizing: border-box;
}

.login-wrapper {
  /* 画面中央にカードを配置 */
  display: flex;
  align-items: center;
  justify-content: center;

  height: 100dvh;
  width: 100%;

  padding: 16px;
  background-color: #f8fafc;

  /* 縦横スクロールバーを出さない */
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

  /* カード自身からもスクロールバーを出さない */
  overflow: hidden;
}

.login-title {
  text-align: center;
  font-size: 1.8rem;
  font-weight: bold;
  color: #1e3a8a;
  margin-bottom: 2rem;

  /* 変にズレないように */
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* ★ここが今回の肝：フォームを中央固定幅のカラムにする */
.login-form {
  width: 100%;
  max-width: 320px; /* 入力欄やボタンをカード中央に“塊”として置く */
  margin: 0 auto;   /* 左右余白を完全均等にする */

  display: flex;
  flex-direction: column;
  align-items: center; /* ラベル/入力/ボタン/テキスト全部を中央寄せの基準に */
}

.form-group {
  width: 100%;
  margin-bottom: 1.2rem;
}

label {
  display: block;
  width: 100%;
  text-align: center; /* ラベルも中央 */
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

  /* 長文でもカードからはみ出さない */
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

  /* スマホは少し幅を広く取る（押しやすさUP） */
  .login-form {
    max-width: 100%;
  }
}
</style>
