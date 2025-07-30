<template>
  <div class="login-container">
    <h2>TMT ログイン</h2>
    <form @submit.prevent="handleLogin">
      <label for="email">メールアドレス</label>
      <input id="email" type="email" v-model="email" required placeholder="example@mail.com" />

      <label for="password">パスワード</label>
      <input id="password" type="password" v-model="password" required placeholder="パスワードを入力" />

      <button type="submit" :disabled="loading">{{ loading ? 'ログイン中...' : 'ログイン' }}</button>
    </form>
    <p class="error-message" v-if="error">{{ error }}</p>

    <p>アカウントをお持ちでない方は  
      <button class="link-button" @click="handleRegister">新規登録</button>
    </p>
  </div>
</template>

<script lang="ts" setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { auth } from '../firebase'
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth'

const email = ref('')
const password = ref('')
const loading = ref(false)
const error = ref('')
const router = useRouter()  // ルーターを使用

async function handleLogin() {
  error.value = ''
  loading.value = true
  try {
    await signInWithEmailAndPassword(auth, email.value, password.value)
    router.push('/menu')  // ログイン成功後にメニュー画面へ遷移
  } catch (e: any) {
    error.value = 'ログインに失敗しました。メールアドレスとパスワードを確認してください。'
  } finally {
    loading.value = false
  }
}

async function handleRegister() {
  error.value = ''
  loading.value = true
  try {
    await createUserWithEmailAndPassword(auth, email.value, password.value)
    router.push('/menu')  // 登録後にもメニュー画面へ遷移（自動ログインされるため）
  } catch (e: any) {
    error.value = '登録に失敗しました。メールアドレスとパスワードの形式を確認してください。'
  } finally {
    loading.value = false
  }
}
</script>


<style scoped>
.login-container {
  max-width: 400px;
  margin: 4rem auto;
  padding: 2rem;
  border: 2px solid #1e3a8a; /* 青系の濃いライン */
  border-radius: 8px;
  background: #fff0f0; /* 薄い赤系背景 */
  box-shadow: 0 0 10px rgba(255, 0, 0, 0.2);
  font-family: Arial, sans-serif;
  color: #1e3a8a; /* 青文字 */
}

h2 {
  text-align: center;
  margin-bottom: 1.5rem;
  color: #dc2626; /* 赤系 */
}

label {
  display: block;
  margin-top: 1rem;
  margin-bottom: 0.5rem;
  font-weight: bold;
}

input {
  width: 100%;
  padding: 0.5rem;
  border: 1px solid #1e3a8a;
  border-radius: 4px;
  font-size: 1rem;
  box-sizing: border-box;
}

button[type="submit"] {
  margin-top: 1.5rem;
  width: 100%;
  background-color: #dc2626; /* 赤 */
  color: white;
  border: none;
  padding: 0.75rem;
  font-weight: bold;
  font-size: 1.1rem;
  border-radius: 4px;
  cursor: pointer;
  transition: background-color 0.3s ease;
}

button[type="submit"]:hover:not(:disabled) {
  background-color: #b91c1c; /* 赤の濃いめ */
}

button[type="submit"]:disabled {
  background-color: #fca5a5; /* 薄い赤 */
  cursor: not-allowed;
}

.error-message {
  margin-top: 1rem;
  color: #b91c1c; /* 濃い赤 */
  font-weight: bold;
  text-align: center;
}

p {
  margin-top: 1.5rem;
  text-align: center;
  color: #1e3a8a; /* 青 */
  font-size: 0.9rem;
}

.link-button {
  background: none;
  border: none;
  color: #2563eb; /* 明るい青 */
  text-decoration: underline;
  cursor: pointer;
  font-weight: bold;
  padding: 0;
  margin-left: 0.3rem;
  font-size: 0.9rem;
}

.link-button:hover {
  color: #1e40af; /* 濃い青 */
}
</style>
