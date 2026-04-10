// firebase.ts
import admin from 'firebase-admin'

// Base64文字列からサービスアカウントJSONを復元
const base64 = process.env.FIREBASE_CONFIG_BASE64

if (!base64) throw new Error('FIREBASE_CONFIG_BASE64 is not set')

const jsonString = Buffer.from(base64, 'base64').toString('utf8')
const serviceAccount = JSON.parse(jsonString)

// バケット名を環境変数から取得（推奨）
const storageBucket = process.env.FIREBASE_STORAGE_BUCKET
if (!storageBucket) throw new Error('FIREBASE_STORAGE_BUCKET is not set')

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    storageBucket: storageBucket,
  })
}

export { admin }
