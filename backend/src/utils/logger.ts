import { admin } from '../firebase'

type AiChatLog = {
  type: 'ai_chat'
  chatType: 'general' | 'knowledge'
  userMessage: string
  aiResponse: string
  toolsUsed?: string[]
  model: string
}

type UserActionLog = {
  type: 'user_action'
  action: string
  details?: Record<string, unknown>
}

const RETENTION_DAYS = 30

export function writeLog(
  userId: string,
  userEmail: string | undefined,
  data: AiChatLog | UserActionLog
): void {
  const expireAt = new Date()
  expireAt.setDate(expireAt.getDate() + RETENTION_DAYS)

  admin
    .firestore()
    .collection('logs')
    .add({
      ...data,
      userId,
      userEmail: userEmail ?? null,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      expireAt,
    })
    .catch((err) => console.error('[LOGGER ERROR]', err))
}
