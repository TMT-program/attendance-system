import express from 'express'
import multer from 'multer'
import { v4 as uuidv4 } from 'uuid'
import { Pinecone } from '@pinecone-database/pinecone'
import axios from 'axios'
import OpenAI from 'openai'
import { admin } from '../firebase'
import { verifyToken, requireAdmin } from '../middleware/auth'

const router = express.Router()
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
})

// ── クライアント初期化 ────────────────────────────────────────────────────────
function getPineconeIndex() {
  const apiKey = process.env.PINECONE_API_KEY
  const indexName = process.env.PINECONE_INDEX_NAME
  if (!apiKey || !indexName) throw new Error('Pinecone env vars are not set')
  const pc = new Pinecone({ apiKey })
  return pc.index(indexName)
}

let cachedOpenAI: OpenAI | null = null
function getOpenAI(): OpenAI {
  if (!cachedOpenAI) {
    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) throw new Error('OPENAI_API_KEY is not set')
    cachedOpenAI = new OpenAI({ apiKey })
  }
  return cachedOpenAI
}

function getAzureClaudeConfig() {
  const apiKey = process.env.AZURE_CLAUDE_API_KEY
  const endpoint = process.env.AZURE_CLAUDE_ENDPOINT
  const model = process.env.AZURE_CLAUDE_MODEL
  if (!apiKey || !endpoint || !model) throw new Error('Azure Claude env vars are not set')
  return { apiKey, endpoint, model }
}

// ── Embedding生成（OpenAI） ──────────────────────────────────────────────────
async function embedText(text: string): Promise<number[]> {
  const openai = getOpenAI()
  const response = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: text,
    dimensions: 768,
  })
  return response.data[0].embedding
}

// ── Azure Claude呼び出し ──────────────────────────────────────────────────────
async function callAzureClaude(messages: any[], tools: any[]): Promise<any> {
  const { apiKey, endpoint, model } = getAzureClaudeConfig()
  const { data } = await axios.post(
    endpoint,
    {
      model,
      max_tokens: 2048,
      system: SYSTEM_PROMPT,
      messages,
      tools,
    },
    {
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
    }
  )
  return data
}

// ── ツール定義 ───────────────────────────────────────────────────────────────
const TOOL_SEARCH_KNOWLEDGE = {
  name: 'search_knowledge',
  description:
    '社内規定・申請手順・就業規則・システムの操作方法・ルールなど社内ナレッジを検索する。勤怠データや個人の出退勤記録は含まない。',
  input_schema: {
    type: 'object',
    properties: {
      query: { type: 'string', description: '検索クエリ' },
    },
    required: ['query'],
  },
}

const TOOL_GET_MY_ATTENDANCE = {
  name: 'get_my_attendance',
  description:
    'ログインユーザー自身の勤怠記録（出退勤時刻・作業内容・ステータス）を取得する。',
  input_schema: {
    type: 'object',
    properties: {
      year: { type: 'string', description: '年（例: 2026）' },
      month: { type: 'string', description: '月（例: 05）' },
    },
    required: ['year', 'month'],
  },
}

const TOOL_GET_ALL_ATTENDANCE = {
  name: 'get_all_attendance',
  description: '全ユーザーの勤怠記録を取得する。管理者専用。',
  input_schema: {
    type: 'object',
    properties: {
      year: { type: 'string', description: '年（例: 2026）' },
      month: { type: 'string', description: '月（例: 05）' },
    },
    required: ['year', 'month'],
  },
}

// ── システムプロンプト ────────────────────────────────────────────────────────
const SYSTEM_PROMPT = `あなたは勤怠管理システムのAIアシスタントです。
ユーザーの質問に応じて適切なツールを使い、日本語で簡潔に回答してください。

ツールの使い分け:
- 社内規定・申請手順・就業規則・経費精算などのルールに関する質問 → search_knowledge を使う
- 自分の出退勤・残業・勤怠記録に関する質問 → get_my_attendance を使う
- 全ユーザーの勤怠に関する質問（管理者のみ利用可能） → get_all_attendance を使う
- ツールが不要な一般的な質問 → そのまま回答する`.trim()

// ── ツール実行関数 ───────────────────────────────────────────────────────────
async function executeSearchKnowledge(query: string): Promise<string> {
  const index = getPineconeIndex()
  const queryVector = await embedText(query)
  const searchResult = await index.query({
    vector: queryVector,
    topK: 5,
    includeMetadata: true,
  })
  const contexts = searchResult.matches
    .filter((m) => (m.score ?? 0) >= 0.5)
    .map((m) => (m.metadata?.text ?? '').toString())
    .filter(Boolean)
  if (contexts.length === 0) return '関連する社内ナレッジが見つかりませんでした。'
  return contexts.map((c, i) => `【参考${i + 1}】\n${c}`).join('\n\n')
}

async function executeGetMyAttendance(uid: string, year: string, month: string): Promise<string> {
  const db = admin.firestore()
  const yearMonth = `${year}-${month.padStart(2, '0')}`
  const docRef = db.collection('attendanceRecords').doc(uid).collection('records').doc(yearMonth)
  const doc = await docRef.get()
  if (!doc.exists) return `${yearMonth}の勤怠データはありません。`
  return JSON.stringify(doc.data())
}

async function executeGetAllAttendance(year: string, month: string): Promise<string> {
  const db = admin.firestore()
  const yearMonth = `${year}-${month.padStart(2, '0')}`

  const usersSnapshot = await db.collection('users').get()
  const userNames: Record<string, string> = {}
  usersSnapshot.forEach((doc) => {
    const data = doc.data()
    userNames[doc.id] = data.displayName || data.email || doc.id
  })

  const recordsSnapshot = await db.collection('attendanceRecords').get()
  const results: Record<string, any> = {}
  for (const userDoc of recordsSnapshot.docs) {
    const recordDoc = await userDoc.ref.collection('records').doc(yearMonth).get()
    if (recordDoc.exists) {
      const name = userNames[userDoc.id] || userDoc.id
      results[name] = recordDoc.data()
    }
  }

  if (Object.keys(results).length === 0) return `${yearMonth}の勤怠データはありません。`
  return JSON.stringify(results)
}

// ── ナレッジ一覧取得 ──────────────────────────────────────────────────────────
router.get('/list', verifyToken, async (_req, res) => {
  try {
    const db = admin.firestore()
    const snapshot = await db
      .collection('knowledge_docs')
      .orderBy('uploadedAt', 'desc')
      .get()

    const docs = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }))
    return res.json(docs)
  } catch (err: any) {
    console.error('[KNOWLEDGE LIST ERROR]', err)
    return res.status(500).json({ error: 'ナレッジ一覧の取得に失敗しました' })
  }
})

// ── ナレッジ登録（ファイルアップロード） ─────────────────────────────────────
router.post('/upload', verifyToken, requireAdmin, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'ファイルが必要です' })

    const { buffer, mimetype } = req.file
    const originalname = Buffer.from(req.file.originalname, 'latin1').toString('utf8')
    const title = (req.body.title as string | undefined)?.trim() || originalname

    const isText =
      mimetype === 'text/plain' ||
      mimetype === 'text/markdown' ||
      originalname.endsWith('.txt') ||
      originalname.endsWith('.md')
    if (!isText) {
      return res.status(400).json({ error: '.txt または .md ファイルのみ登録できます' })
    }

    const text = buffer.toString('utf8').trim()
    if (!text) return res.status(400).json({ error: 'ファイルの内容が空です' })

    const index = getPineconeIndex()
    const docId = uuidv4()

    const values = await embedText(text)
    await index.upsert({ records: [{ id: docId, values, metadata: { text, title, docId } }] })

    const db = admin.firestore()
    await db.collection('knowledge_docs').doc(docId).set({
      docId,
      title,
      originalname,
      uploadedAt: admin.firestore.FieldValue.serverTimestamp(),
    })

    return res.json({ docId, title })
  } catch (err: any) {
    console.error('[KNOWLEDGE UPLOAD ERROR]', err)
    return res.status(500).json({ error: 'アップロードに失敗しました' })
  }
})

// ── ナレッジ内容取得 ──────────────────────────────────────────────────────────
router.get('/:docId/content', verifyToken, requireAdmin, async (req, res) => {
  try {
    const { docId } = req.params
    const db = admin.firestore()
    const docSnap = await db.collection('knowledge_docs').doc(docId).get()
    if (!docSnap.exists) return res.status(404).json({ error: 'ドキュメントが見つかりません' })

    const { title } = docSnap.data() as { title: string }

    const index = getPineconeIndex()
    const fetchResult = await index.fetch({ ids: [docId] })
    const content = (fetchResult.records?.[docId]?.metadata?.text as string) ?? ''

    return res.json({ title, content })
  } catch (err: any) {
    console.error('[KNOWLEDGE CONTENT ERROR]', err)
    return res.status(500).json({ error: 'ナレッジの取得に失敗しました' })
  }
})

// ── ナレッジ削除 ──────────────────────────────────────────────────────────────
router.delete('/:docId', verifyToken, requireAdmin, async (req, res) => {
  try {
    const { docId } = req.params
    const db = admin.firestore()
    const docSnap = await db.collection('knowledge_docs').doc(docId).get()
    if (!docSnap.exists) return res.status(404).json({ error: 'ドキュメントが見つかりません' })

    const index = getPineconeIndex()
    try {
      await index.deleteOne({ id: docId })
    } catch (pineconeErr: any) {
      console.warn('[KNOWLEDGE DELETE] Pinecone deleteOne skipped:', pineconeErr?.message)
    }
    await db.collection('knowledge_docs').doc(docId).delete()

    return res.json({ success: true })
  } catch (err: any) {
    console.error('[KNOWLEDGE DELETE ERROR]', err)
    return res.status(500).json({ error: 'ナレッジの削除に失敗しました' })
  }
})

// ── チャット（Function Calling） ──────────────────────────────────────────────
router.post('/chat', verifyToken, async (req, res) => {
  try {
    const message = ((req.body as any).message ?? '').toString().trim()
    if (!message) return res.status(400).json({ error: 'message is required' })
    if (message.length > 500) return res.status(400).json({ error: 'message is too long' })

    console.log('[KNOWLEDGE CHAT REQUEST]', {
      uid: req.uid,
      isAdmin: req.isAdmin,
      message,
    })

    const tools: any[] = [TOOL_SEARCH_KNOWLEDGE, TOOL_GET_MY_ATTENDANCE]
    if (req.isAdmin) tools.push(TOOL_GET_ALL_ATTENDANCE)

    const messages: any[] = [{ role: 'user', content: message }]
    const usedTools: string[] = []
    const MAX_ITERATIONS = 5
    let response: any

    for (let i = 0; i < MAX_ITERATIONS; i++) {
      console.log(`[AZURE CLAUDE REQUEST] iteration=${i}`, {
        messages_count: messages.length,
      })

      response = await callAzureClaude(messages, tools)

      console.log('[AZURE CLAUDE RESPONSE]', {
        stop_reason: response.stop_reason,
        content_types: response.content?.map((c: any) => c.type),
        usage: response.usage,
      })

      if (response.stop_reason !== 'tool_use') break

      messages.push({ role: 'assistant', content: response.content })

      const toolResults: any[] = []
      for (const block of response.content as any[]) {
        if (block.type !== 'tool_use') continue

        const toolName: string = block.name
        const toolInput = block.input
        usedTools.push(toolName)

        console.log('[TOOL EXECUTE]', { tool: toolName, input: toolInput })

        let result: string
        try {
          if (toolName === 'search_knowledge') {
            result = await executeSearchKnowledge(toolInput.query)
          } else if (toolName === 'get_my_attendance') {
            result = await executeGetMyAttendance(req.uid!, toolInput.year, toolInput.month)
          } else if (toolName === 'get_all_attendance' && req.isAdmin) {
            result = await executeGetAllAttendance(toolInput.year, toolInput.month)
          } else {
            result = '権限がありません'
          }
        } catch (toolErr: any) {
          result = `ツール実行エラー: ${toolErr.message}`
          console.error('[TOOL ERROR]', { tool: toolName, error: toolErr.message })
        }

        console.log('[TOOL RESULT]', { tool: toolName, result_length: result!.length })

        toolResults.push({
          type: 'tool_result',
          tool_use_id: block.id,
          content: result!,
        })
      }

      messages.push({ role: 'user', content: toolResults })
    }

    const textBlock = response?.content?.find((c: any) => c.type === 'text')
    const text = textBlock?.text ?? '（回答を生成できませんでした）'

    console.log('[KNOWLEDGE CHAT RESPONSE]', {
      usedTools,
      text_length: text.length,
    })

    return res.json({ text, usedTools })
  } catch (err: any) {
    console.error('[KNOWLEDGE CHAT ERROR]', err)
    return res.status(500).json({ error: 'チャットの処理に失敗しました' })
  }
})

export default router
