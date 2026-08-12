import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import ws from 'ws';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_KEY || '';

// Supabase クライアントの初期化 (ws as any で型エラーとNode20のWebSocketエラーを同時に回避)
const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
  realtime: {
    transport: ws as any,
  },
});
// ヘルスチェック用（動いているか確認）
app.get('/', (req: Request, res: Response) => {
  res.send('Article-Stocker API is running!');
});


// 記事保存 API (POST /api/articles)
app.post('/api/articles', async (req: Request, res: Response) => {
  try {
    const { user_id = 1, url, title, memo } = req.body;

    if (!url || !title) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'URL and Title are required'
      });
    }

    // Supabaseにデータ挿入
    const { data, error } = await supabase
      .from('articles')
      .insert([{ user_id, url, title, memo }])
      .select()
      .single();

    if (error) throw error;

    // Discord通知処理（Webhook送信）
    const discordWebhookUrl = process.env.DISCORD_WEBHOOK_URL;
    if (discordWebhookUrl) {
      // 埋め込み（Embeds）形式メッセージ
      const discordPayload = {
        embeds: [
          {
            title: `記事をストックしました`,
            color: 0x3498db, // ブルー
            fields: [
              { name: 'タイトル', value: title, inline: false },
              { name: 'URL', value: url, inline: false },
              ...(memo ? [{ name: 'メモ', value: memo, inline: false }] : []),
            ],
            timestamp: new Date().toISOString(),
          },
        ],
      };

      // バックグラウンドでDiscordに送信（レスポンスを待たずに非同期実行して高速化）
      fetch(discordWebhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(discordPayload),
      }).catch((err) => console.error('Discord notification failed:', err));
    }

    // 成功レスポンス
    return res.status(201).json({
      message: 'Article saved successfully',
      data
    });
  } catch (error: any) {
    console.error('Error saving article:', error);
    return res.status(500).json({ error: 'Internal Server Error', details: error.message });
  }
});

// ストック一覧取得 API (GET /api/articles)
app.get('/api/articles', async (req: Request, res: Response) => {
  try {
    const userId = req.query.user_id || 1;

    // Supabaseから指定ユーザーの全記事を取得（作成日時の降順）
    const { data, error } = await supabase
      .from('articles')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    // 成功レスポンス（将来のメタデータ拡張を見据えたオブジェクト形式）
    return res.status(200).json({
      total_count: data.length,
      data
    });
  } catch (error: any) {
    console.error('Error fetching articles:', error);
    return res.status(500).json({ error: 'Internal Server Error', details: error.message });
  }
});

// サーバー起動
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});