import { describe, it, expect, vi, beforeEach } from 'vitest'
import request from 'supertest'

// firebase-admin をモック（実際の認証基盤に触れないようにする）
const mockVerifyIdToken = vi.hoisted(() => vi.fn())

vi.mock('../firebase', () => ({
  admin: {
    auth: vi.fn(() => ({ verifyIdToken: mockVerifyIdToken })),
    firestore: vi.fn(() => ({
      collection: vi.fn(() => ({
        doc: vi.fn(() => ({ get: vi.fn(), set: vi.fn(), delete: vi.fn() })),
        get: vi.fn(),
      })),
    })),
    storage: vi.fn(() => ({ bucket: vi.fn(() => ({})) })),
  },
}))

import app from '../app'

// ── 1. 認証チェック ───────────────────────────────────────────────────────────
describe('認証チェック', () => {
  it('Authorizationヘッダーがない場合は401を返す', async () => {
    const res = await request(app)
      .post('/api/knowledge/chat')
      .send({ message: 'テスト' })

    expect(res.status).toBe(401)
    expect(res.body.error).toBe('認証が必要です')
  })

  it('無効なトークンの場合は401を返す', async () => {
    mockVerifyIdToken.mockRejectedValueOnce(new Error('Invalid token'))

    const res = await request(app)
      .post('/api/knowledge/chat')
      .set('Authorization', 'Bearer invalid-token')
      .send({ message: 'テスト' })

    expect(res.status).toBe(401)
    expect(res.body.error).toBe('認証トークンが無効です')
  })
})

// ── 2. 入力バリデーション ─────────────────────────────────────────────────────
describe('入力バリデーション', () => {
  beforeEach(() => {
    // 認証を通過させる
    mockVerifyIdToken.mockResolvedValue({ uid: 'user-1', admin: false })
  })

  it('messageがない場合は400を返す', async () => {
    const res = await request(app)
      .post('/api/knowledge/chat')
      .set('Authorization', 'Bearer valid-token')
      .send({})

    expect(res.status).toBe(400)
    expect(res.body.error).toBe('message is required')
  })

  it('messageが500文字を超える場合は400を返す', async () => {
    const res = await request(app)
      .post('/api/knowledge/chat')
      .set('Authorization', 'Bearer valid-token')
      .send({ message: 'a'.repeat(501) })

    expect(res.status).toBe(400)
    expect(res.body.error).toBe('message is too long')
  })
})

// ── 3. 管理者権限チェック ─────────────────────────────────────────────────────
describe('管理者権限チェック', () => {
  it('一般ユーザーがナレッジ削除エンドポイントにアクセスすると403を返す', async () => {
    mockVerifyIdToken.mockResolvedValue({ uid: 'user-1', admin: false })

    const res = await request(app)
      .delete('/api/knowledge/some-doc-id')
      .set('Authorization', 'Bearer valid-token')

    expect(res.status).toBe(403)
    expect(res.body.error).toBe('管理者権限が必要です')
  })
})
