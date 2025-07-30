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
