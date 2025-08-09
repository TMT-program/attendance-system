# 📅 勤怠管理システム（Attendance Management System）

## 📝 概要

このシステムは、**勤怠・勤務報告管理ツール**です。  
ユーザーによる出勤・退勤の打刻、作業内容の記録・提出、管理者による勤務実績の確認・承認、さらに周知事項のPDF共有機能まで、**現場で必要な機能を一通り備えています**。

---

## 🚀 主な機能

- 🔐 Firebase Authentication によるログイン（メールアドレス/パスワード）
- 🕒 出勤・退勤打刻（同日に1レコード記録）
- 📋 作業内容の記録と「未提出／承認待ち／承認済み」ステータス管理
- 📊 勤務実績画面（勤務時間・休暇数などを月単位で表示）
- ✅ 管理者による勤務報告の確認・承認
- 👥 ユーザーの追加・削除・管理者権限の切り替え
- 📄 管理者によるPDF周知ファイルのアップロード・共有
- 📱 スマホ画面対応（順次改良中）

---

## 🔧 使用技術スタック

| 分類 | 技術 |
|------|------|
| フロントエンド | Vue 3, TypeScript, Vite |
| UIライブラリ | lucide-vue-next, CSS |
| バックエンド | Node.js, Express |
| データベース | Firebase Firestore（サブコレクション構造） |
| 認証 | Firebase Authentication |
| ファイルストレージ | Firebase Storage |
| デプロイ | Vercel（フロント）, Render（バックエンド） |
| その他 | axios, multer, dayjs, GitHub, Firebase CLI |

---

## 📌 ロールによる画面・機能の違い

| 権限 | 機能概要 |
|------|----------|
| 一般ユーザー | 勤怠打刻、勤務報告の提出・確認、PDFの閲覧 |
| 管理者ユーザー | 全ユーザーの勤務報告確認・承認、ユーザー管理、PDFアップロードなど全機能 |

---

## 🧑‍💻 開発者プロフィール（TMT）

- 1993年8月22日生まれ（31歳）
- 大阪府立高津高校卒
- 慶應義塾大学理工学部 応用化学科 卒業
- 2018年～現在まで、IT企業にて **システム開発に従事**

現在は、IT企業でエンジニアをやりながら、将来的な**フリーランス独立を視野に入れたポートフォリオ作成、小規模案件への挑戦**に取り組んでいます。  
**生成AIを活用した効率的な開発**を実践し、早く正確な開発を目指しています。

---

## 🛠 技術スタック（本プロジェクトで使用）

- **Vue 3 / TypeScript / Vite**
- **Node.js / Express / Firebase（Auth・Firestore・Storage）**
- axios / multer / lucide-vue / dayjs / GitHub / Vercel / Render など

---

## 🧳 その他の経験技術（本プロジェクト外）

過去の業務経験で以下のような技術にも触れてきました。

- **Linux**
- **React**
- **Oracle Database**
- **Java**
- **VBA**

---

## 🌐 デモURL（要ログイン）

- フロントエンド：  
  [https://attendance-system-eight-iota.vercel.app/login](https://attendance-system-eight-iota.vercel.app/login)

※ デモシステムを利用の際は、以下のデモ用ユーザーをご利用ください。
■管理者ユーザー
USER：TMT_Admin@example.com
PASS：AdminTest99

■一般ユーザー
USER：TMT_User@example.com
PASS：UserTest99

---

## 📬 お問い合わせ

- GitHub: [https://github.com/TMT-program](https://github.com/TMT-program)  
- X(twitter):[https://x.com/tomato19345821](https://x.com/tomato19345821)
