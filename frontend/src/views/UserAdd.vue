<template>
  <div class="user-section">
    <h2 class="section-title">➕ ユーザー追加</h2>
    <div class="form-box">
      <input v-model="newEmail" type="email" placeholder="メールアドレス" />
      <input v-model="newPassword" type="password" placeholder="パスワード" />
      <button @click="addUser">追加</button>
    </div>
    <p v-if="addMessage" class="message">{{ addMessage }}</p>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import axios from 'axios'
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL

const newEmail = ref('')
const newPassword = ref('')
const addMessage = ref('')

interface AddUserResponse {
  email: string
}

const addUser = async () => {
  try {
    const res = await axios.post<AddUserResponse>(`${API_BASE_URL}/api/users`, {
      email: newEmail.value,
      password: newPassword.value,
      displayName: newEmail.value.split('@')[0]
    })
    addMessage.value = `${res.data.email} を追加しました`
    newEmail.value = ''
    newPassword.value = ''
  } catch (error) {
    console.error('追加失敗:', error)
    addMessage.value = 'ユーザー追加に失敗しました'
  }
}
</script>

<style scoped>
.user-section {
  padding: 2rem 1rem;
  max-width: 600px;
  margin: 0 auto;
  text-align: center;
  color: #1e3a8a;
}

.section-title {
  font-size: 1.8rem;
  margin-bottom: 1.5rem;
  white-space: nowrap;
}

.form-box {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
}

.form-box input {
  padding: 0.6rem;
  width: 100%;
  max-width: 360px;
  font-size: 1rem;
  border: 1px solid #ccc;
  border-radius: 4px;
  box-sizing: border-box;
}

.form-box button {
  width: 100%;
  max-width: 200px;
  padding: 0.6rem 1rem;
  background-color: #1e3a8a;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 1rem;
}

.form-box button:hover {
  background-color: #3b82f6;
}

.message {
  margin-top: 1.2rem;
  font-size: 1rem;
  color: #334155;
  word-break: break-word;
}

/* スマホ向け調整 */
@media (max-width: 480px) {
  .section-title {
    font-size: 1.5rem;
  }

  .form-box input,
  .form-box button {
    max-width: 100%;
    font-size: 0.95rem;
  }

  .form-box {
    gap: 0.8rem;
  }
}
</style>
