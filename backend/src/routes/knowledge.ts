import express from 'express'
import multer from 'multer'
import { v4 as uuidv4 } from 'uuid'
import { Pinecone } from '@pinecone-database/pinecone'
import axios from 'axios'
import OpenAI from 'openai'
import { admin } from '../firebase'
import { verifyToken, requireAdmin } from '../middleware/auth'
import { writeLog } from '../utils/logger'

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

const USE_LOCAL_LLM = process.env.USE_LOCAL_LLM === 'true'

// ── Ollama（ローカルLLM）呼び出し ────────────────────────────────────────────
async function callLocalLLM(messages: any[], tools: any[], systemPrompt: string): Promise<any> {
  const client = new OpenAI({ baseURL: 'http://localhost:11434/v1', apiKey: 'dummy' })
  const openAITools = tools.map((tool) => ({
    type: 'function' as const,
    function: { name: tool.name, description: tool.description, parameters: tool.input_schema },
  }))
  return client.chat.completions.create({
    model: 'gemma3:4b',
    messages: [{ role: 'system', content: systemPrompt }, ...messages],
    tools: openAITools,
  })
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
async function callAzureClaude(messages: any[], tools: any[], isAdmin: boolean): Promise<any> {
  const { apiKey, endpoint, model } = getAzureClaudeConfig()
  const { data } = await axios.post(
    endpoint,
    {
      model,
      max_tokens: 2048,
      system: buildSystemPrompt(isAdmin),
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
  description: '全ユーザーまたは特定ユーザーの勤怠記録を取得する。他のユーザーの勤怠を確認したい場合にも使用する。管理者専用。',
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
function buildSystemPrompt(isAdmin: boolean): string {
  const now = new Date().toLocaleString('ja-JP', {
    timeZone: 'Asia/Tokyo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    weekday: 'short',
  })
  const role = isAdmin ? '管理者（全ユーザーの勤怠データにアクセス可能）' : '一般ユーザー'
  return `あなたは勤怠管理システムのAIアシスタントです。
ユーザーの質問に応じて適切なツールを使い、日本語で簡潔に回答してください。

現在の日時: ${now}（日本時間）
現在のユーザー権限: ${role}

ツールの使い分け:
- 社内規定・申請手順・就業規則・経費精算などのルールに関する質問 → search_knowledge を使う
- 自分の出退勤・残業・勤怠記録に関する質問 → get_my_attendance を使う
- 全ユーザーまたは他のユーザー個人の勤怠に関する質問（管理者のみ利用可能） → get_all_attendance を使う
- ツールが不要な一般的な質問 → そのまま回答する`.trim()
}

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
  const results: Record<string, any> = {}

  await Promise.all(
    usersSnapshot.docs.map(async (userDoc) => {
      const data = userDoc.data()
      const name = data.displayName || data.email || userDoc.id
      const recordDoc = await db
        .collection('attendanceRecords')
        .doc(userDoc.id)
        .collection('records')
        .doc(yearMonth)
        .get()
      if (recordDoc.exists) {
        results[name] = recordDoc.data()
      }
    })
  )

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

// ── ツール実行共通ヘルパー ────────────────────────────────────────────────────
async function executeTool(toolName: string, toolInput: any, uid: string, isAdmin: boolean): Promise<string> {
  if (toolName === 'search_knowledge') {
    return executeSearchKnowledge(toolInput.query)
  } else if (toolName === 'get_my_attendance') {
    return executeGetMyAttendance(uid, toolInput.year, toolInput.month)
  } else if (toolName === 'get_all_attendance' && isAdmin) {
    return executeGetAllAttendance(toolInput.year, toolInput.month)
  } else {
    return '権限がありません'
  }
}

// ── チャットコアロジック（HTTP・Slack両方から呼び出し可能） ──────────────────
export async function runKnowledgeChat(
  message: string,
  history: { role: string; content: string }[],
  uid: string,
  isAdmin: boolean
): Promise<{ text: string; usedTools: string[] }> {
  const tools: any[] = [TOOL_SEARCH_KNOWLEDGE, TOOL_GET_MY_ATTENDANCE]
  if (isAdmin) tools.push(TOOL_GET_ALL_ATTENDANCE)

  const messages: any[] = [
    ...history.map((h) => ({ role: h.role, content: h.content })),
    { role: 'user', content: message },
  ]
  const usedTools: string[] = []
  const MAX_ITERATIONS = 5
  let finalText = '（回答を生成できませんでした）'

  for (let i = 0; i < MAX_ITERATIONS; i++) {
    if (USE_LOCAL_LLM) {
      console.log(`[OLLAMA REQUEST] iteration=${i}`, { messages_count: messages.length })
      const ollamaRes = await callLocalLLM(messages, tools, buildSystemPrompt(isAdmin))
      const choice = ollamaRes.choices[0]
      console.log('[OLLAMA RESPONSE]', { finish_reason: choice.finish_reason })

      if (choice.finish_reason !== 'tool_calls' || !choice.message.tool_calls?.length) {
        finalText = choice.message.content ?? finalText
        break
      }
      messages.push(choice.message)

      for (const toolCall of choice.message.tool_calls) {
        const toolName: string = toolCall.function.name
        const toolInput = JSON.parse(toolCall.function.arguments)
        usedTools.push(toolName)
        console.log('[TOOL EXECUTE]', { tool: toolName, input: toolInput })
        let result: string
        try {
          result = await executeTool(toolName, toolInput, uid, isAdmin)
        } catch (toolErr: any) {
          result = `ツール実行エラー: ${toolErr.message}`
          console.error('[TOOL ERROR]', { tool: toolName, error: toolErr.message })
        }
        console.log('[TOOL RESULT]', { tool: toolName, result_length: result!.length })
        messages.push({ role: 'tool', tool_call_id: toolCall.id, content: result! })
      }
    } else {
      console.log(`[AZURE CLAUDE REQUEST] iteration=${i}`, { messages_count: messages.length })
      const response = await callAzureClaude(messages, tools, isAdmin)
      console.log('[AZURE CLAUDE RESPONSE]', { stop_reason: response.stop_reason, content_types: response.content?.map((c: any) => c.type), usage: response.usage })

      if (response.stop_reason !== 'tool_use') {
        const textBlock = response?.content?.find((c: any) => c.type === 'text')
        finalText = textBlock?.text ?? finalText
        break
      }
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
          result = await executeTool(toolName, toolInput, uid, isAdmin)
        } catch (toolErr: any) {
          result = `ツール実行エラー: ${toolErr.message}`
          console.error('[TOOL ERROR]', { tool: toolName, error: toolErr.message })
        }
        console.log('[TOOL RESULT]', { tool: toolName, result_length: result!.length })
        toolResults.push({ type: 'tool_result', tool_use_id: block.id, content: result! })
      }
      messages.push({ role: 'user', content: toolResults })
    }
  }

  return { text: finalText, usedTools }
}

// ── チャット（Function Calling） ──────────────────────────────────────────────
router.post('/chat', verifyToken, async (req, res) => {
  try {
    const message = ((req.body as any).message ?? '').toString().trim()
    if (!message) return res.status(400).json({ error: 'message is required' })
    if (message.length > 500) return res.status(400).json({ error: 'message is too long' })

    const rawHistory: any[] = Array.isArray((req.body as any).history) ? (req.body as any).history : []
    const history = rawHistory
      .filter((h) => (h.role === 'user' || h.role === 'assistant') && typeof h.content === 'string')
      .slice(-20)

    console.log('[KNOWLEDGE CHAT REQUEST]', { uid: req.uid, isAdmin: req.isAdmin, message, provider: USE_LOCAL_LLM ? 'ollama' : 'azure-claude' })

    const result = await runKnowledgeChat(message, history, req.uid!, req.isAdmin ?? false)

    writeLog(req.uid!, req.email, {
      type: 'ai_chat',
      chatType: 'knowledge',
      userMessage: message,
      aiResponse: result.text,
      toolsUsed: result.usedTools,
      model: USE_LOCAL_LLM ? 'ollama/gemma3:4b' : 'azure-claude',
    })

    console.log('[KNOWLEDGE CHAT RESPONSE]', { usedTools: result.usedTools, text_length: result.text.length })
    return res.json(result)
  } catch (err: any) {
    console.error('[KNOWLEDGE CHAT ERROR]', err)
    return res.status(500).json({ error: 'チャットの処理に失敗しました' })
  }
})

export default router
