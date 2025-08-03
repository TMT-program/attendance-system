//デプロイ環境で動かす時
// firebase.ts
import admin from 'firebase-admin'

// Base64文字列からサービスアカウントJSONを復元
const base64 = process.env.FIREBASE_CONFIG_BASE64

if (!base64) throw new Error('FIREBASE_CONFIG_BASE64 is not set')

const jsonString = Buffer.from(base64, 'base64').toString('utf8')
const serviceAccount = JSON.parse(jsonString)

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  })
}

export { admin }


//////////////////////////////


// localで動かす時
// import admin from 'firebase-admin';
// import path from 'path';
// import { readFileSync } from 'fs';

// // JSON を require で読み込む（型安全でないが確実）
// const serviceAccount = JSON.parse(
//   readFileSync(path.resolve(__dirname, 'serviceAccountKey.json'), 'utf8')
// );

// if (!admin.apps.length) {
//   admin.initializeApp({
//     credential: admin.credential.cert(serviceAccount),
//   });
// }

// export { admin };
