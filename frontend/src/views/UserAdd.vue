<template>
  <div class="user-section">
    <h2 class="section-title">➕ ユーザー追加</h2>
    <div class="form-box">
      <input v-model="newEmail" type="email" placeholder="メールアドレス" />
      <input v-model="newPassword" type="password" placeholder="パスワード" />
      <button @click="addUser">追加</button>
    </div>
    <p v-if="addMessage">{{ addMessage }}</p>
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
  padding: 2rem;
  max-width: 800px;
  margin: 0 auto;
  text-align: center;
  color: #1e3a8a;
}

.section-title {
  font-size: 1.8rem;
  margin-bottom: 1.5rem;
}

.form-box input {
  display: block;
  margin: 0.5rem auto;
  padding: 0.5rem;
  width: 300px;
  font-size: 1rem;
  border: 1px solid #ccc;
  border-radius: 4px;
}

.form-box button {
  padding: 0.5rem 1.5rem;
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

.back-button {
  padding: 0.5rem 1.5rem;
  font-size: 1.1rem;
  background-color: #1e3a8a;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  margin-top: 1.5rem;
}

.back-button:hover {
  background-color: #3b82f6;
}
</style>
