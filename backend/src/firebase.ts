//デプロイ環境で動かす時
// import admin from 'firebase-admin';

// // 環境変数から値を取得
// const projectId = process.env.FIREBASE_PROJECT_ID;
// const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
// let privateKey = process.env.FIREBASE_PRIVATE_KEY;

// // 必須項目が欠けていないか確認
// if (!projectId || !clientEmail || !privateKey) {
//   throw new Error('Firebase環境変数が不足しています');
// }

// // 改行コード（\n）を正しく解釈
// privateKey = privateKey.replace(/\\n/g, '\n');

// // Firebase Admin SDK の初期化
// if (!admin.apps.length) {
//   admin.initializeApp({
//     credential: admin.credential.cert({
//       projectId,
//       clientEmail,
//       privateKey,
//     }),
//   });
// }

// export { admin };


//////////////////////////////


// localで動かす時
import admin from 'firebase-admin';
import path from 'path';
import { readFileSync } from 'fs';

// JSON を require で読み込む（型安全でないが確実）
const serviceAccount = JSON.parse(
  readFileSync(path.resolve(__dirname, 'serviceAccountKey.json'), 'utf8')
);

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

export { admin };
