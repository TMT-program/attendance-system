# 📅 勤怠管理システム（Attendance Management System）

Vue + Node.js + Firebase を用いて構築した、**勤怠・勤務報告管理ツール（ポートフォリオ）**です。  
出勤/退勤打刻、勤務報告の提出・承認、ユーザー管理、周知事項PDFの共有まで、実務を想定した機能を一通り実装しています。

---

## 🌐 デモURL（要ログイン）

- フロントエンド：  
  https://attendance-system-eight-iota.vercel.app/login

> ※ログイン画面にもデモ用アカウント情報を記載しています。

### デモ用アカウント

**■管理者ユーザー**  
USER：TMT_Admin@example.com  
PASS：AdminTest99  

**■一般ユーザー**  
USER：TMT_User@example.com  
PASS：UserTest99  

---

## 🚀 主な機能

### 🔐 認証 / 権限
- Firebase Authentication によるログイン（メールアドレス/パスワード）
- Firestore に保存した `role`（管理者/一般）で画面・操作を出し分け

### 🕒 勤怠打刻
- 出勤・退勤の打刻（Firestoreに保存）
- 打刻データは日付単位で管理

### 📋 勤務報告（提出・承認）
- 作業内容の選択（プルダウン）
- 状態管理（未承認 / 承認待ち / 承認済）
- 状態に応じて行の背景色を変更
- 管理者による勤務報告の確認・承認（ステータス更新）

### 📊 勤務実績
- 月単位の勤務実績テーブル表示
- 勤務時間（出勤〜退勤の差）を **HH:MM** 形式で表示
- 月次サマリー表示（ユーザー名・勤務時間合計・休暇日数 など）
- 土日祝の表示（薄赤背景）

### 👥 ユーザー管理（管理者のみ）
- ユーザー一覧（検索・ページネーション）
- 管理者権限の ON/OFF 切替
- ユーザー削除（API連携）
- ユーザー追加（API連携）

### 📄 周知事項（PDF共有）
- 周知PDFの一覧表示・別タブで閲覧
- **Firebase Storage 経由で配信**
- 管理者のみ：PDFアップロード/削除  
  - ドラッグ＆ドロップ対応  
  - PDF限定 / 複数同時アップロード / エラーメッセージ表示

### 📦 出力
- 勤務実績確認（管理者）画面で **CSV出力**（実績の持ち出しを想定）

### 📱 レスポンシブ対応
- **スマホ表示対応済み**

---

## 🔧 技術スタック

| 分類 | 技術 |
|------|------|
| フロントエンド | Vue 3 / TypeScript / Vite |
| UI | CSS / lucide-vue-next |
| バックエンド | Node.js / Express |
| DB | Firebase Firestore |
| 認証 | Firebase Authentication |
| ファイル | Firebase Storage |
| デプロイ | Vercel（フロント） / Render（バックエンド） |
| その他 | axios / multer / dayjs / GitHub / Firebase CLI |

---

## 📌 ロールによる画面・機能の違い

| 権限 | 機能概要 |
|------|----------|
| 一般ユーザー | 勤怠打刻、勤務報告の提出・確認、周知PDFの閲覧 |
| 管理者ユーザー | 全ユーザーの勤務報告確認・承認、ユーザー管理、周知PDFアップロード/削除、CSV出力 |

---

## 🧑‍💻 開発者（TMT）

- IT企業にてシステム開発に従事（2018年〜）
- フリーランス独立を視野に、実務に近い要件を想定したポートフォリオを継続開発中
- 生成AIも活用しつつ、品質とスピードの両立を意識して活動中

---

## 📚 システム説明書 / リポジトリ
- 本リポジトリ：  
  https://github.com/TMT-program/attendance-system

---

  ## 🗺️ システム構成図（デプロイ構成）

```mermaid
flowchart LR
  U[ユーザー<br/>PC / スマホ] -->|HTTPS| FE[Vercel<br/>Vue3 + Vite]

  FE -->|REST API(axios)| BE[Render<br/>Node.js + Express]

  FE -->|認証| AUTH[Firebase Authentication]
  BE -->|勤怠/勤務報告データ| DB[Firebase Firestore]
  BE -->|周知PDFのアップ/削除| ST[Firebase Storage]
  FE -->|周知PDFの閲覧| ST


