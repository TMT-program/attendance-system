import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'

// Firebase と API をモック（実際の通信が発生しないようにする）
vi.mock('../firebase', () => ({ auth: {} }))
vi.mock('firebase/auth', () => ({
  onAuthStateChanged: vi.fn((_, callback) => {
    callback({ uid: 'user-1' })
    return () => {}
  }),
}))
vi.mock('../api', () => ({
  default: { post: vi.fn() },
}))

import KnowledgeChat from '../views/KnowledgeChat.vue'

const stubs = {
  Bot: { template: '<span />' },
  Send: { template: '<span />' },
}

describe('KnowledgeChat', () => {
  beforeEach(() => {
    sessionStorage.clear()
  })

  // ── 1. 初期状態 ─────────────────────────────────────────────────────────────
  it('初期状態で残り送信回数が10と表示される', async () => {
    const wrapper = mount(KnowledgeChat, { global: { stubs } })
    expect(wrapper.text()).toContain('残り回数：')
    expect(wrapper.text()).toContain('10')
  })

  // ── 2. 入力なしでボタンが無効 ───────────────────────────────────────────────
  it('入力が空の場合は送信ボタンが無効になる', async () => {
    const wrapper = mount(KnowledgeChat, { global: { stubs } })
    const btn = wrapper.find('button.send-btn')
    expect(btn.attributes('disabled')).toBeDefined()
  })

  // ── 3. 入力後にボタンが有効 ─────────────────────────────────────────────────
  it('テキストを入力すると送信ボタンが有効になる', async () => {
    const wrapper = mount(KnowledgeChat, { global: { stubs } })
    await wrapper.find('textarea').setValue('質問テスト')
    const btn = wrapper.find('button.send-btn')
    expect(btn.attributes('disabled')).toBeUndefined()
  })

  // ── 4. 文字数制限 ───────────────────────────────────────────────────────────
  it('300文字を超えて入力するとエラーメッセージが表示される', async () => {
    const wrapper = mount(KnowledgeChat, { global: { stubs } })
    const textarea = wrapper.find('textarea')
    await textarea.setValue('あ'.repeat(300))
    await textarea.trigger('input')
    expect(wrapper.text()).toContain('300文字')
  })

  // ── 5. 送信回数上限 ─────────────────────────────────────────────────────────
  it('送信回数が上限（10回）に達すると送信ボタンが無効になる', async () => {
    sessionStorage.setItem('knowledge_chat_send_count_v1', '10')
    const wrapper = mount(KnowledgeChat, { global: { stubs } })
    await wrapper.find('textarea').setValue('テスト')
    const btn = wrapper.find('button.send-btn')
    expect(btn.attributes('disabled')).toBeDefined()
  })
})
