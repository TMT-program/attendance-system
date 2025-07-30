import { createRouter, createWebHistory, RouteRecordRaw } from 'vue-router'
import TmtHome from '../views/TmtHome.vue'
import Login from '../views/Login.vue'
import Menu from '../views/Menu.vue'
import UserManagement from '../views/UserManagement.vue'
import AttendanceReport from '../views/AttendanceReport.vue'
import Announcements from '../views/Announcements.vue'

const routes: Array<RouteRecordRaw> = [
  {
    path: '/',
    name: 'Home',
    component: TmtHome,
  },
  {
    path: '/login',        // ログインページのURL
    name: 'Login',
    component: Login,
  },
  {
    path: '/menu',
    name: 'Menu',
    component: Menu,
  },
  {
    path: '/user-management',
    name: 'UserManagement',
    component: UserManagement,
  },
  {
    path: '/AttendanceReport',
    name: 'AttendanceReport',
    component: AttendanceReport,
  },
    {
    path: '/Announcements',
    name: 'Announcements',
    component: Announcements,
  },
  // 他のルートがあればここに追加
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

export default router
