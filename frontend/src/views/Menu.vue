<template>
  <div class="menu-container">
    <h1 class="title">メニュー</h1>

    <LoadingSpinner v-if="isLoading" />

    <div class="menu-grid" v-else>
      <button v-if="isAdmin" class="menu-card" @click="goToUserManagement">
        <User class="icon" />
        <span class="label">ユーザー管理</span>
      </button>

      <button class="menu-card" @click="goToAttendanceReport">
        <ClipboardEdit class="icon" />
        <span class="label">勤務報告</span>
      </button>

      <button class="menu-card" @click="goAnnouncements">
        <Megaphone class="icon" />
        <span class="label">周知事項</span>
      </button>

      <!-- ✅ 追加：AIチャット -->
      <button class="menu-card" @click="goToAIChat">
        <Bot class="icon" />
        <span class="label">AIチャット</span>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { User, ClipboardEdit, Megaphone, MessageCircle, Bot, Cpu } from 'lucide-vue-next'
import { auth } from '../firebase'
import { onAuthStateChanged } from 'firebase/auth'
import { doc, getDoc, getFirestore } from 'firebase/firestore'
import LoadingSpinner from '../components/LoadingSpinner.vue'

const router = useRouter()
const isAdmin = ref(false)
const isLoading = ref(true)

const db = getFirestore()

/**
 * ✅ 横はみ出し判定ログ
 * - DevTools上で「横スクロールバーが出る」原因の切り分け用
 * - diff = (scrollWidth - clientWidth)
 *   - 0: 実体としてははみ出していない（見かけの可能性）
 *   - 1以上: 何かが右にはみ出している（修正対象）
 */
const logOverflowX = (label: string) => {
  const de = document.documentElement
  const body = document.body
  const diff = de.scrollWidth - de.clientWidth

  console.log(`[overflow-check:${label}] diff=${diff}`, {
    de_clientWidth: de.clientWidth,
    de_scrollWidth: de.scrollWidth,
    body_clientWidth: body?.clientWidth,
    body_scrollWidth: body?.scrollWidth,
  })

  // diffが正なら、はみ出し犯人候補を少し出す（重いので必要時だけ）
  if (diff > 0) {
    const offenders = Array.from(document.querySelectorAll<HTMLElement>('body *'))
      .filter((el) => el.scrollWidth > el.clientWidth)
      .slice(0, 15)
      .map((el) => ({
        tag: el.tagName.toLowerCase(),
        class: el.className,
        id: el.id,
        clientWidth: el.clientWidth,
        scrollWidth: el.scrollWidth,
      }))

    console.log(`[overflow-check:${label}] offenders(top15)`, offenders)
  }
}

const onResize = () => {
  logOverflowX('resize')
}

onMounted(() => {
  // ① mounted直後（初期状態）
  logOverflowX('mounted')

  window.addEventListener('resize', onResize)

  onAuthStateChanged(auth, async (u) => {
    if (u) {
      const userDoc = await getDoc(doc(db, 'users', u.uid))
      if (userDoc.exists()) {
        const data = userDoc.data()
        isAdmin.value = data.isAdmin === true
      }
    }

    // ② ローディング解除直後（DOMが切り替わるタイミング）
    isLoading.value = false
    logOverflowX('loading-false-immediate')

    // ③ DOM反映後（これが本命）
    await nextTick()
    logOverflowX('after-nextTick')
  })
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', onResize)
})

const goToUserManagement = () => {
  router.push({ name: 'UserManagement' })
}

const goToAttendanceReport = () => {
  router.push({ name: 'AttendanceReport' })
}

const goAnnouncements = () => {
  router.push({ name: 'Announcements' })
}

/** ✅ 追加：AIチャット画面へ */
const goToAIChat = () => {
  router.push({ name: 'AIChat' })
}
</script>

<style scoped>
.menu-container {
  padding: 2rem;
  max-width: 900px;
  margin: 0 auto;
  text-align: center;
  font-family: 'Segoe UI', sans-serif;
}

.title {
  font-size: 2.4rem;
  margin-bottom: 2rem;
  color: #1e3a8a;
  font-weight: bold;
}

/* ✅ まずはスマホ/タブレット：今まで通り（中央寄せ・折り返しOK） */
.menu-grid {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 2rem;
}

/* ✅ PC：1行3つまで、4つ目は次段で左寄せ */
@media (min-width: 900px) {
  .menu-container {
    text-align: left; /* タイトルや全体の基準を左寄せに寄せる（カードが左寄せでも自然） */
  }

  .title {
    text-align: center; /* タイトルは今まで通り中央が良ければ残す（不要なら削除OK） */
  }

  .menu-grid {
    flex-wrap: wrap;              /* ✅ 折り返しOKにする */
    justify-content: flex-start;  /* ✅ 左寄せ */
    gap: 2rem;
  }

  .menu-container {
    max-width: 980px; /* 900だと中身が足りないので少し広げる */
  }
}

.menu-card {
  width: 260px;
  height: 160px;
  border: 2px solid #1e3a8a;
  border-radius: 12px;
  background-color: #f8fafc;
  color: #1e3a8a;
  font-size: 1.2rem;
  font-weight: bold;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  transition: all 0.3s ease;
  cursor: pointer;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.08);
}

.menu-card:hover {
  background-color: #e0f2fe;
  transform: translateY(-4px);
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.15);
}

.icon {
  width: 2.4rem;
  height: 2.4rem;
  margin-bottom: 0.5rem;
  color: #334155;
  transition: color 0.2s ease;
}

.menu-card:hover .icon {
  color: #dc2626;
}

.label {
  font-size: 1.1rem;
}
</style>
