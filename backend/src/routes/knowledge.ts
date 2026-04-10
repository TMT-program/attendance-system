import express from 'express'
import multer from 'multer'
import { v4 as uuidv4 } from 'uuid'
import { Pinecone } from '@pinecone-database/pinecone'
import axios from 'axios'
import { admin } from '../firebase'

const router = express.Router()
const upload = multer({ storage: multer.memoryStorage() })

// ── クライアント初期化 ──────────────────────────────────────────────────────
function getPineconeIndex() {
  const apiKey = process.env.PINECONE_API_KEY
  const indexName = process.env.PINECONE_INDEX_NAME
  if (!apiKey || !indexName) throw new Error('Pinecone env vars are not set')
  const pc = new Pinecone({ apiKey })
  return pc.index(indexName)
}

function getGeminiApiKey(): string {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) throw new Error('GEMINI_API_KEY is not set')
  return apiKey
}

// ── テキストのチャンク分割 ────────────────────────────────────────────────────
function chunkText(text: string, maxLen = 400): string[] {
  const paragraphs = text.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean)
  const chunks: string[] = []
  let current = ''

  for (const para of paragraphs) {
    if ((current + '\n\n' + para).trim().length <= maxLen) {
      current = current ? current + '\n\n' + para : para
    } else {
      if (current) chunks.push(current.trim())
      // 1パラグラフ自体がmaxLenを超える場合は強制分割
      if (para.length > maxLen) {
        for (let i = 0; i < para.length; i += maxLen) {
          chunks.push(para.slice(i, i + maxLen))
        }
        current = ''
      } else {
        current = para
      }
    }
  }
  if (current) chunks.push(current.trim())
  return chunks
}

// ── Embedding生成 ────────────────────────────────────────────────────────────
async function embedText(apiKey: string, text: string): Promise<number[]> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-001:embedContent?key=${apiKey}`
  const { data } = await axios.post<any>(url, {
    model: 'models/gemini-embedding-001',
    content: { parts: [{ text }] },
    outputDimensionality: 768,
  })
  return data.embedding.values as number[]
}

async function generateAnswer(apiKey: string, prompt: string): Promise<string> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${apiKey}`
  const { data } = await axios.post<any>(url, {
    contents: [{ parts: [{ text: prompt }] }],
  })
  return data.candidates?.[0]?.content?.parts?.[0]?.text ?? ''
}

// ── ナレッジ一覧取得 ──────────────────────────────────────────────────────────
router.get('/list', async (_req, res) => {
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
    return res.status(500).json({ error: err.message ?? 'Failed to list knowledge' })
  }
})

// ── ナレッジ登録（ファイルアップロード） ─────────────────────────────────────
router.post('/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'ファイルが必要です' })

    const { buffer, mimetype } = req.file
    const originalname = Buffer.from(req.file.originalname, 'latin1').toString('utf8')
    const title = (req.body.title as string | undefined)?.trim() || originalname

    // txt / md のみ許可
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

    const chunks = chunkText(text)
    if (chunks.length === 0) return res.status(400).json({ error: 'チャンクの生成に失敗しました' })

    const apiKey = getGeminiApiKey()
    const index = getPineconeIndex()
    const docId = uuidv4()

    // 各チャンクをEmbeddingしてPineconeへupsert
    const vectors = await Promise.all(
      chunks.map(async (chunk, i) => {
        const values = await embedText(apiKey, chunk)
        return {
          id: `${docId}_chunk_${i}`,
          values,
          metadata: { text: chunk, title, docId, chunkIndex: i },
        }
      })
    )
    await index.upsert({ records: vectors })

    // Firestoreにドキュメントメタデータを保存
    const db = admin.firestore()
    await db.collection('knowledge_docs').doc(docId).set({
      docId,
      title,
      originalname,
      chunkCount: chunks.length,
      uploadedAt: admin.firestore.FieldValue.serverTimestamp(),
    })

    return res.json({ docId, title, chunkCount: chunks.length })
  } catch (err: any) {
    console.error('[KNOWLEDGE UPLOAD ERROR]', err)
    return res.status(500).json({ error: err.message ?? 'Upload failed' })
  }
})

// ── ナレッジ削除 ──────────────────────────────────────────────────────────────
router.delete('/:docId', async (req, res) => {
  try {
    const { docId } = req.params
    const db = admin.firestore()
    const docSnap = await db.collection('knowledge_docs').doc(docId).get()
    if (!docSnap.exists) return res.status(404).json({ error: 'ドキュメントが見つかりません' })

    const { chunkCount } = docSnap.data() as { chunkCount: number }
    const ids = Array.from({ length: chunkCount }, (_, i) => `${docId}_chunk_${i}`)
    console.log('[DELETE] docId:', docId, 'chunkCount:', chunkCount, 'ids:', ids)

    const index = getPineconeIndex()
    try {
      await index.deleteMany(ids)
    } catch (pineconeErr: any) {
      console.error('[DELETE PINECONE ERROR]', JSON.stringify(pineconeErr), pineconeErr.message)
      throw pineconeErr
    }
    await db.collection('knowledge_docs').doc(docId).delete()

    return res.json({ success: true })
  } catch (err: any) {
    console.error('[KNOWLEDGE DELETE ERROR]', err)
    return res.status(500).json({ error: err.message ?? 'Delete failed' })
  }
})

// ── RAGチャット ───────────────────────────────────────────────────────────────
router.post('/chat', async (req, res) => {
  try {
    const message = ((req.body as any).message ?? '').toString().trim()
    if (!message) return res.status(400).json({ error: 'message is required' })
    if (message.length > 500) return res.status(400).json({ error: 'message is too long' })

    const apiKey = getGeminiApiKey()
    const index = getPineconeIndex()

    // 質問をEmbeddingしてPineconeで類似検索
    const queryVector = await embedText(apiKey, message)
    const searchResult = await index.query({
      vector: queryVector,
      topK: 5,
      includeMetadata: true,
    })

    const contexts = searchResult.matches
      .filter((m) => (m.score ?? 0) >= 0.5)
      .map((m) => (m.metadata?.text ?? '').toString())
      .filter(Boolean)

    // コンテキストが取れなかった場合
    if (contexts.length === 0) {
      return res.json({
        text: '関連する社内ナレッジが見つかりませんでした。別のキーワードで質問してみてください。',
      })
    }

    const contextText = contexts.map((c, i) => `【参考${i + 1}】\n${c}`).join('\n\n')

    const prompt = `あなたは社内ナレッジを元に質問に答えるAIアシスタントです。
以下の「社内ナレッジ」の情報のみを根拠として、ユーザーの質問に日本語で簡潔に回答してください。
ナレッジに記載のない内容については「社内ナレッジには記載がありません」と答えてください。

【社内ナレッジ】
${contextText}

【ユーザーの質問】
${message}`

    const text = await generateAnswer(apiKey, prompt)

    return res.json({ text })
  } catch (err: any) {
    console.error('[KNOWLEDGE CHAT ERROR]', err)
    return res.status(500).json({ error: err.message ?? 'Chat failed' })
  }
})

export default router
