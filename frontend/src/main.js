import { createApp } from 'vue'
import './style.css'
import App from './App.vue'
import router from './router'
import './assets/main.css'

// ✅ Firebase Auth の復元が終わるまで待ってからアプリを起動する
import { getAuth, onAuthStateChanged } from 'firebase/auth'

const auth = getAuth()

let appInitialized = false

onAuthStateChanged(auth, () => {
  // ✅ 初回だけ mount する（onAuthStateChanged はログイン/ログアウトでも呼ばれるため）
  if (!appInitialized) {
    createApp(App).use(router).mount('#app')
    appInitialized = true
  }
})
