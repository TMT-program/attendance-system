//デプロイ環境で動かす時
// // firebase.ts
// import admin from 'firebase-admin'

// // Base64文字列からサービスアカウントJSONを復元
// const base64 = process.env.FIREBASE_CONFIG_BASE64

// if (!base64) throw new Error('FIREBASE_CONFIG_BASE64 is not set')

// const jsonString = Buffer.from(base64, 'base64').toString('utf8')
// const serviceAccount = JSON.parse(jsonString)

// // バケット名を環境変数から取得（推奨）
// const storageBucket = process.env.FIREBASE_STORAGE_BUCKET
// if (!storageBucket) throw new Error('FIREBASE_STORAGE_BUCKET is not set')

// if (!admin.apps.length) {
//   admin.initializeApp({
//     credential: admin.credential.cert(serviceAccount),
//     storageBucket: 'tmt-project-fcdc8', // ← Firebase Storage用
//   })
// }

// export { admin }



//////////////////////////////


// localで動かす時
import admin from 'firebase-admin';
import path from 'path';
import { readFileSync } from 'fs';

// serviceAccountKey.json を読み込み
const serviceAccount = JSON.parse(
  readFileSync(path.resolve(__dirname, 'serviceAccountKey.json'), 'utf8')
);

// バケット名を明示的に指定（ここは自分のプロジェクトに合わせて変更）
const storageBucket = 'tmt-project-fcdc8';

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    storageBucket: 'tmt-project-fcdc8', // ← ここを追加
  });
}

export { admin };

