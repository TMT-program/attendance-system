import express from 'express';
import fs from 'fs';
import path from 'path';

const router = express.Router();
const infoDir = path.resolve('C:/Users/kurin/INFO');

// 一覧取得
router.get('/', (req, res) => {
  fs.readdir(infoDir, (err, files) => {
    if (err) {
      return res.status(500).json({ error: 'ファイル一覧取得に失敗しました' });
    }

    const pdfFiles = files.filter(file => file.endsWith('.pdf'));
    res.json(pdfFiles);
  });
});

// 個別ファイルの取得
router.get('/:filename', (req, res) => {
  const filename = req.params.filename;
  const filePath = path.join(infoDir, filename);

  if (!filePath.startsWith(infoDir)) {
    return res.status(400).json({ error: '不正なファイルパスです' });
  }

  res.sendFile(filePath);
});

export default router;
