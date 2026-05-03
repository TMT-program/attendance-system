import express from 'express'
import OpenAI from 'openai'
import util from 'node:util'
import rateLimit from 'express-rate-limit'
import { verifyToken } from '../middleware/auth'

const chatRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1分
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'リクエストが多すぎます。しばらく待ってから再試行してください。' },
})

const router = express.Router()

// ✅ 勤怠システム向け system プロンプト（固定）
const SYSTEM_PROMPT = `
あなたは勤怠管理システムのAIアシスタントです。
このシステムの利用者（一般ユーザー/管理者）に対して、操作方法・入力ルール・承認フロー・画面の見方などを分かりやすく案内してください。

【回答ルール】
- 回答は可能な限り短く、簡潔にお願いします。
- 分からないことは推測で断定せず、確認すべき情報を質問してください。
- パスワード、APIキー、個人情報など機密情報の入力は促さない。
- 法律/医療/税務など高リスク領域は一般的な案内に留め、必要なら専門家へ誘導する。
`.trim()

type ChatRequestBody = {
  message?: string
  // ✅ 追加：会話継続用（フロントが保持して次回送る）
  previousResponseId?: string
  context?: Record<string, unknown>
}

type ChatResponseBody = {
  text: string
  // ✅ 追加：今回のレスポンスID（次回のpreviousResponseIdに使う）
  responseId: string
  // debug=1 のときだけ付ける
  debug?: {
    status: any
    error: any
    incomplete_details: any
    output_len: number
    has_output_text: boolean
    output_text_len: number
    usage: any
    // 生のレスポンスも必要なら見る（重いのでdebug時のみ）
    raw?: any
  }
}

/**
 * ✅ OpenAI client は「必要になったら作る」
 */
let cachedClient: OpenAI | null = null
function getClient() {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) return null
  if (!cachedClient) cachedClient = new OpenAI({ apiKey })
  return cachedClient
}

/**
 * ✅ Responses API の戻りは状況により output_text が空のことがあるため、
 * output 配列を走査して message.content からテキストを抽出する。
 */
function extractTextFromResponse(resp: any): string {
  const t = (resp?.output_text ?? '').toString().trim()
  if (t) return t

  const output = resp?.output
  if (!Array.isArray(output)) return ''

  const texts: string[] = []

  for (const item of output) {
    if (item?.type !== 'message') continue

    const content = item?.content
    if (!Array.isArray(content)) continue

    for (const c of content) {
      const candidate = (c?.text ?? c?.content ?? c?.value ?? '').toString()
      if (candidate.trim()) texts.push(candidate)
    }
  }

  return texts.join('\n').trim()
}

/**
 * エラーのメッセージ整形（ユーザーに見せても安全な範囲）
 */
function toSafeErrorMessage(err: any): string {
  const msg = (err?.message ?? '').toString()
  if (msg) return msg
  return 'AI request failed'
}

/**
 * ✅ JSON化で落ちにくくする（BigInt等が来ても耐える）
 */
function safeJson(obj: any) {
  return JSON.parse(
    JSON.stringify(obj, (_key, value) => {
      if (typeof value === 'bigint') return value.toString()
      return value
    })
  )
}

function logObj(label: string, obj: any) {
  console.log(
    label,
    util.inspect(obj, {
      depth: null,
      colors: false,
      maxArrayLength: null,
      maxStringLength: null,
    })
  )
}

router.post('/chat', verifyToken, chatRateLimit, async (req, res) => {
  // ✅ ルート到達確認（これが出ないならルートが叩けてない）
  console.log('[CHAT ROUTE HIT]', { time: new Date().toISOString() })

  try {
    const client = getClient()
    if (!client) {
      return res.status(500).json({ error: 'OPENAI_API_KEY is not set' })
    }

    const body = req.body as ChatRequestBody
    const message = (body.message ?? '').trim()
    const previousResponseId = (body.previousResponseId ?? '').trim()

    if (!message) {
      return res.status(400).json({ error: 'message is required' })
    }

    if (message.length > 2000) {
      return res
        .status(400)
        .json({ error: 'message is too long (max 2000 chars)' })
    }

    const debugMode = String(req.query.debug ?? '') === '1'

    /**
     * ✅ 重要：
     * - previous_response_id で会話継続したい場合、
     *   instructions が常に引き継がれるとは限らない（継続時に効かないケースがある）
     * - そこで、初回だけ system を input に入れて会話に「刻む」
     * - 継続時は追加分だけ送る（履歴全部は送らない）
     */
    const firstTurn = !previousResponseId
    const input = firstTurn
      ? ([
          { role: 'system' as const, content: SYSTEM_PROMPT },
          { role: 'user' as const, content: message },
        ] as const)
      : message

    // ✅ previous_response_id が壊れている時のために「再試行」も入れておく
    const createOnce = async (usePrev: boolean) => {
      const args: any = {
        model: 'gpt-5-mini',

        // 初回：system+user / 継続：userだけ（文字列）
        input,

        // ✅ 会話継続（必要なら付与）
        ...(usePrev && previousResponseId
          ? { previous_response_id: previousResponseId }
          : {}),

        // ✅ 会話継続用途なので明示
        store: true,

        // 推論を軽くして “空っぽ” を避ける
        reasoning: { effort: 'minimal' },

        // テキスト出力を明示
        text: { format: { type: 'text' } },

        // いったん余裕を持たせる
        max_output_tokens: 1000,
      }

      return await client.responses.create(args)
    }

    let response: any
    try {
      response = await createOnce(true)
    } catch (e: any) {
      // previous_response_id が無効/期限切れ等なら、新規会話としてやり直す
      const status = e?.status
      if (previousResponseId && (status === 400 || status === 404)) {
        console.warn('[AI WARN] previous_response_id invalid. retry without it.', {
          status,
        })
        response = await createOnce(false)
      } else {
        throw e
      }
    }

    // ✅ 空っぽ切り分け用ログ（debugModeに関係なく軽量なものは出す）
    console.log('[AI META]', {
      id: (response as any)?.id ?? null,
      status: response?.status,
      output_len: Array.isArray((response as any)?.output)
        ? (response as any).output.length
        : -1,
      output_text_len: ((response as any)?.output_text ?? '').toString().length,
      incomplete_details: (response as any)?.incomplete_details ?? null,
      has_error: !!(response as any)?.error,
      usage: (response as any)?.usage ?? null,
      used_previous_response_id: !!previousResponseId,
      first_turn: firstTurn,
    })

    if (debugMode) {
      // debug時は丸ごと見たい（重いので普段はやらない）
      logObj('[AI RAW RESPONSE]', response)
    }

    const extractedText = extractTextFromResponse(response)

    const payload: ChatResponseBody = {
      text:
        extractedText ||
        '（回答を生成できませんでした。もう一度別の聞き方で試してください。）',
      responseId: (response?.id ?? '').toString(),
    }

    if (debugMode) {
      payload.debug = {
        status: (response as any)?.status ?? null,
        error: (response as any)?.error ?? null,
        incomplete_details: (response as any)?.incomplete_details ?? null,
        output_len: Array.isArray((response as any)?.output)
          ? (response as any).output.length
          : 0,
        has_output_text: !!((response as any)?.output_text ?? '').toString()
          .trim(),
        output_text_len: ((response as any)?.output_text ?? '').toString().length,
        usage: (response as any)?.usage ?? null,
        raw: safeJson(response),
      }
    }

    return res.json(payload)
  } catch (err: any) {
    const status = err?.status ?? 500
    const msg = toSafeErrorMessage(err)

    console.error('[AI ERROR]', {
      status,
      message: msg,
      // OpenAI SDKのエラー詳細があれば参考に出す
      type: err?.type,
      code: err?.code,
    })

    return res
      .status(status >= 400 && status < 600 ? status : 500)
      .json({ error: msg })
  }
})

export default router
