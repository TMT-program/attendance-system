import { createRouter, createWebHistory, RouteRecordRaw } from 'vue-router'
import { auth } from '../firebase'  // Firebase認証の状態を確認するために必要
import Login from '../views/Login.vue'
import Menu from '../views/Menu.vue'
import UserManagement from '../views/UserManagement.vue'
import AttendanceReport from '../views/AttendanceReport.vue'
import Announcements from '../views/Announcements.vue'
import UserMenu from '../views/UserMenu.vue'
import UserList from '../views/UserList.vue'
import UserAdd from '../views/UserAdd.vue'
import UserDelete from '../views/UserDelete.vue'

const routes: Array<RouteRecordRaw> = [
  {
    path: '/',
    redirect: '/login'
  },
  {
    path: '/login',
    name: 'Login',
    component: Login,
  },
  {
    path: '/menu',
    name: 'Menu',
    component: Menu,
    meta: { requiresAuth: true }, // 🔐 認証が必要
  },
  {
    path: '/user-management',
    name: 'UserManagement',
    component: UserManagement,
    meta: { requiresAuth: true }, // 🔐 認証が必要
  },
  {
    path: '/AttendanceReport',
    name: 'AttendanceReport',
    component: AttendanceReport,
    meta: { requiresAuth: true }, // 🔐 認証が必要
  },
  {
    path: '/Announcements',
    name: 'Announcements',
    component: Announcements,
    meta: { requiresAuth: true }, // 🔐 認証が必要
  },
  {
    path: '/UserMenu',
    name: 'UserMenu',
    component: UserMenu
  },
  {
    path: '/UserList',
    name: 'UserList',
    component: UserList
  },
  {
    path: '/UserAdd',
    name: 'UserAdd',
    component: UserAdd
  },
  {
    path: '/UserDelete',
    name: 'UserDelete',
    component: UserDelete
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

// 👇 認証ガードを設定
router.beforeEach((to, from, next) => {
  const requiresAuth = to.matched.some(record => record.meta.requiresAuth)
  const currentUser = auth.currentUser

  if (requiresAuth && !currentUser) {
    // 未ログインで認証が必要なページにアクセスしようとした場合
    next('/login')
  } else {
    next()
  }
})

export default router
