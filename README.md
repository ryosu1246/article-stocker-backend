# Article Stocker API & Extension

閲覧中のWeb記事や技術記事をブラウザ拡張機能からワンクリックでデータベースに保存し、Discordへ通知するWebアプリケーションです。

---

## 概要

技術学習において「後で読む記事」を効率的に管理するため、Chrome拡張機能・自作バックエンドAPI・データベース・通知ツールを連携させたシステムを構築しました。

ブラウザで開いているページのタイトルとURLを自動取得し、メモを添えて送信することで、Supabaseへのデータ保存とDiscordチャンネルへの即時通知を行います。

---

## システム構成・データフロー

1. **Chrome Extension (フロントエンド)**: 開いているタブの `title` と `url` を自動取得し、ユーザー入力の `memo` とともにAPIへPOST送信
2. **Express API on Render (バックエンド)**: リクエストのバリデーション、Supabaseへのデータ挿入、Discord Webhookへの通知リクエストを発行
3. **Supabase (PostgreSQL)**: 記事データの永続化
4. **Discord**: Webhook経由で保存通知の受信

---

## 使用技術 (Tech Stack)

| 区分 | 技術・サービス | 用途 |
| :--- | :--- | :--- |
| **FrontEnd** | JavaScript / HTML / CSS | Chrome拡張機能 (Manifest V3) |
| **BackEnd** | Node.js (v20) / TypeScript (v5) / Express | REST API サーバー |
| **Database** | Supabase (PostgreSQL) | 記事データの永続化 |
| **Infrastructure** | Render (Web Service) | バックエンドAPIのホスティング |
| **Notification** | Discord Webhook | リアルタイム通知 |
| **Tool / Package** | tsx, @supabase/supabase-js, ws | 開発ランタイム, DB接続クライアント |

---

## データベース設計 (DB Schema)

### users テーブル

| カラム名 | 型 | 制約 | 説明 |
| :--- | :--- | :--- | :--- |
| `id` | bigint | PRIMARY KEY, GENERATED ALWAYS AS IDENTITY | ユーザーID |
| `created_at` | timestamptz | DEFAULT now() | 作成日時 |

### articles テーブル

| カラム名 | 型 | 制約 | 説明 |
| :--- | :--- | :--- | :--- |
| `id` | bigint | PRIMARY KEY, GENERATED ALWAYS AS IDENTITY | 記事ID |
| `user_id` | bigint | NOT NULL, REFERENCES users(id) | 投稿ユーザーID (外部キー) |
| `url` | text | NOT NULL | 記事のURL |
| `title` | text | NOT NULL | 記事のタイトル |
| `memo` | text | NULL | ユーザー入力メモ |
| `created_at` | timestamptz | DEFAULT now() | 保存日時 |

---

## API エンドポイント

### 1. 記事保存 API

* **Method**: `POST`
* **Path**: `/api/articles`
* **Content-Type**: `application/json`

#### Request Body
```json
{
  "user_id": 1,
  "url": "[https://example.com/tech-article](https://example.com/tech-article)",
  "title": "TypeScriptとExpressによるAPI開発",
  "memo": "後で動作確認する"
}
```

#### Response (201 Created)
```JSON
{
  "message": "Article saved successfully",
  "data": {
    "id": 1,
    "user_id": 1,
    "url": "[https://example.com/tech-article](https://example.com/tech-article)",
    "title": "TypeScriptとExpressによるAPI開発",
    "memo": "後で動作確認する",
    "created_at": "2026-08-13T00:00:00.000Z"
  }
}
```

### 2. 記事一覧取得 API
* **Method**: `GET`
* **Path**: `/api/articles?user_id=1`

#### Response (200 OK)
```JSON
{
  "total_count": 1,
  "data": [
    {
      "id": 1,
      "user_id": 1,
      "url": "[https://example.com/tech-article](https://example.com/tech-article)",
      "title": "TypeScriptとExpressによるAPI開発",
      "memo": "後で動作確認する",
      "created_at": "2026-08-13T00:00:00.000Z"
    }
  ]
}
```

## 工夫した点・トラブルシューティング
- 開発環境依存エラーの解決: TypeScriptの互換性に伴うエラー回避のため、
  ts-node-dev から軽量かつ高速な tsx ランタイムへ切り替え、開発効率とビルドの安定性を確保しました。

- Node.js 20におけるWebSocket互換性対処: Node.js 20環境でSupabase SDKを初期化する際、
  標準のWebSocket実装不在によるエラーが発生したため、
  ws パッケージをインポートして明示的に指定することで解消しました。

- TypeScript厳格モードとビルド設定の最適化: TypeScript v7およびNode.js環境でのビルドエラーに対し、
  tsconfig.json の module と moduleResolution を node16 に整合させ、
  Render環境での安定したCJSビルドを実現しました。

- 非同期処理による応答速度維持: DiscordへのWebHook通知処理をバックグラウンド非同期実行とすることで、
  APIレスポンスの遅延（レイテンシ）を防止しました。

## 今後の改善予定

- Discord上での保存記事一覧の閲覧機能実装
- 記事保存時に指定日時後でのリマインド通知機能実装
- フロントエンド開発と保存記事のフォルダ分類機能実装
