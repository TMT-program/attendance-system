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

export function writeLog(
  userId: string,
  userEmail: string | undefined,
  data: AiChatLog | UserActionLog
): void {
  admin
    .firestore()
    .collection('logs')
    .add({
      ...data,
      userId,
      userEmail: userEmail ?? null,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
    })
    .catch((err) => console.error('[LOGGER ERROR]', err))
}
