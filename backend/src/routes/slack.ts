import { App, ExpressReceiver } from '@slack/bolt'
import { admin } from '../firebase'
import { runKnowledgeChat } from './knowledge'
import { writeLog } from '../utils/logger'

const receiver = new ExpressReceiver({
  signingSecret: process.env.SLACK_SIGNING_SECRET!,
  endpoints: '/slack/events',
})

const slackApp = new App({
  token: process.env.SLACK_BOT_TOKEN!,
  receiver,
})

// Slack UserID → Firebase UID / isAdmin を解決
async function findFirebaseUser(slackUserId: string, client: any): Promise<{ uid: string; isAdmin: boolean } | null> {
  try {
    const info = await client.users.info({ user: slackUserId })
    const email = info.user?.profile?.email
    if (!email) return null

    const firebaseUser = await admin.auth().getUserByEmail(email)
    const userDoc = await admin.firestore().collection('users').doc(firebaseUser.uid).get()
    const isAdmin = userDoc.data()?.role === 'admin'
    return { uid: firebaseUser.uid, isAdmin }
  } catch (err: any) {
    console.error('[SLACK USER LOOKUP ERROR]', err.message)
    return null
  }
}

// JST の現在時刻を「HH:MM」形式で返す
function jstTimeStr(): string {
  return new Date().toLocaleTimeString('ja-JP', { timeZone: 'Asia/Tokyo', hour: '2-digit', minute: '2-digit' })
}

// 打刻処理の共通ロジック（二重打刻チェック付き）
// 戻り値: 'ok' | 'already_punched' | 'not_started'
async function recordAttendance(uid: string, type: 'start' | 'end'): Promise<'ok' | 'already_punched' | 'not_started'> {
  const now = new Date()
  const jst = new Date(now.getTime() + 9 * 60 * 60 * 1000)
  const year = jst.getUTCFullYear()
  const month = String(jst.getUTCMonth() + 1).padStart(2, '0')
  const day = String(jst.getUTCDate()).padStart(2, '0')
  const yearMonth = `${year}-${month}`
  const dayKey = `${month}-${day}`
  const timeStr = `${String(jst.getUTCHours()).padStart(2, '0')}:${String(jst.getUTCMinutes()).padStart(2, '0')}`

  const docRef = admin.firestore()
    .collection('attendanceRecords').doc(uid)
    .collection('records').doc(yearMonth)

  const doc = await docRef.get()
  const existing = doc.exists ? (doc.data()?.[dayKey] ?? {}) : {}

  if (type === 'start' && existing.start) return 'already_punched'
  if (type === 'end' && existing.end) return 'already_punched'
  if (type === 'end' && !existing.start) return 'not_started'

  await docRef.set({ [dayKey]: { [type]: timeStr } }, { merge: true })
  return 'ok'
}

// ── /kintai コマンド ───────────────────────────────────────────────────────────
slackApp.command('/kintai', async ({ command, ack, respond, client }) => {
  await ack()

  const sub = command.text.trim().toLowerCase()
  if (sub !== 'start' && sub !== 'end') {
    await respond('使い方: `/kintai start` で出勤、`/kintai end` で退勤')
    return
  }

  const user = await findFirebaseUser(command.user_id, client)
  if (!user) {
    await respond('Slackのメールアドレスが勤怠システムに登録されていません。システム管理者に確認してください。')
    return
  }

  try {
    const result = await recordAttendance(user.uid, sub)

    if (result === 'already_punched') {
      const label = sub === 'start' ? '出勤' : '退勤'
      await respond(`:warning: 本日はすでに${label}打刻済みです。`)
      return
    }
    if (result === 'not_started') {
      await respond(':warning: 出勤打刻がされていないため退勤できません。先に `/kintai start` を実行してください。')
      return
    }

    writeLog(user.uid, undefined, {
      type: 'user_action',
      action: sub === 'start' ? 'punch_in' : 'punch_out',
      details: { via: 'slack' },
    })

    const emoji = sub === 'start' ? ':sunrise:' : ':city_sunset:'
    const label = sub === 'start' ? '出勤' : '退勤'
    await respond(`${emoji} ${label}打刻しました（${jstTimeStr()} JST）`)
  } catch (err: any) {
    console.error('[SLACK KINTAI ERROR]', err)
    await respond('打刻処理中にエラーが発生しました。')
  }
})

// ── @mention → ナレッジチャット ───────────────────────────────────────────────
slackApp.event('app_mention', async ({ event, say, client }) => {
  const message = (event as any).text.replace(/<@[A-Z0-9]+>/g, '').trim()
  if (!message) {
    await say('何かお手伝いできますか？勤怠の質問や社内ナレッジの検索ができます。')
    return
  }

  const user = await findFirebaseUser((event as any).user, client)
  const uid = user?.uid ?? 'slack-anonymous'
  const isAdmin = user?.isAdmin ?? false

  try {
    const result = await runKnowledgeChat(message, [], uid, isAdmin)
    writeLog(uid, undefined, {
      type: 'ai_chat',
      chatType: 'knowledge',
      userMessage: message,
      aiResponse: result.text,
      toolsUsed: result.usedTools,
      model: 'azure-claude',
    })
    await say(result.text)
  } catch (err: any) {
    console.error('[SLACK MENTION ERROR]', err)
    await say('処理中にエラーが発生しました。')
  }
})

// ── DM → ナレッジチャット ─────────────────────────────────────────────────────
slackApp.message(async ({ message, say, client }) => {
  const msg = message as any
  if (msg.bot_id || msg.subtype || msg.channel_type !== 'im') return

  const text = msg.text?.trim()
  if (!text) return

  const user = await findFirebaseUser(msg.user, client)
  const uid = user?.uid ?? 'slack-anonymous'
  const isAdmin = user?.isAdmin ?? false

  try {
    const result = await runKnowledgeChat(text, [], uid, isAdmin)
    writeLog(uid, undefined, {
      type: 'ai_chat',
      chatType: 'knowledge',
      userMessage: text,
      aiResponse: result.text,
      toolsUsed: result.usedTools,
      model: 'azure-claude',
    })
    await say(result.text)
  } catch (err: any) {
    console.error('[SLACK DM ERROR]', err)
    await say('処理中にエラーが発生しました。')
  }
})

export const slackRouter = receiver.router
