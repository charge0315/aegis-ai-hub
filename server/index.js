/**
 * Gadget Concierge Plus - Server Entry Point
 * MCP (Model Context Protocol) と HTTP API を通じてパーソナライズされたニュースを提供します。
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { rateLimit } from 'express-rate-limit';
import 'dotenv/config';

import { ScraperFacade } from './src/ScraperFacade.js';
import { HealthMonitor } from './src/jobs/HealthMonitor.js';

// --- 初期設定とパス構成 ---
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const INTERESTS_PATH = process.env.INTERESTS_PATH || path.join(__dirname, 'data', 'interests.json');
const FEEDS_PATH = process.env.FEEDS_PATH || path.join(__dirname, 'data', 'feed_config.json');

// 環境変数のバリデーション
if (!process.env.GEMINI_API_KEY) {
    console.error("【警告】GEMINI_API_KEY が設定されていません。.env ファイルを確認してください。");
} else {
    console.log("[System] Gemini API Key loaded successfully.");
}

// コアサービスの初期化
const scraper = new ScraperFacade(INTERESTS_PATH, FEEDS_PATH);

// バックグラウンド・ヘルスチェックの開始 (1時間に1回実行)
const monitor = new HealthMonitor(scraper.feedManager);
monitor.start();

/**
 * ==========================================
 * MCP (Model Context Protocol) サーバー設定
 * ==========================================
 */
const mcpServer = new Server({
    name: "gadget-concierge-mcp",
    version: "1.1.0",
}, {
    capabilities: { tools: {} },
});

// 1. 利用可能なツールの定義
mcpServer.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: [
        {
            name: "get_gadget_dashboard",
            description: "最新のガジェットニュースをスクレイピングしてパーソナライズ済みのJSON形式で返します。",
            inputSchema: { type: "object", properties: {} }
        },
        {
            name: "get_gemini_picks",
            description: "Gemini AIを使用して、ユーザーの好みに最も合致する10記事を厳選し、推薦理由を添えて返します。",
            inputSchema: { type: "object", properties: {} }
        },
        {
            name: "add_gadget_interest",
            description: "ユーザーの興味リスト（カテゴリ、ブランド、キーワード）に新しい項目を追加します。",
            inputSchema: {
                type: "object",
                properties: {
                    type: { type: "string", enum: ["category", "keyword", "brand"], description: "追加項目の種類" },
                    value: { type: "string", description: "名称（例: Minisforum）" },
                    name: { type: "string", description: "キーワード追加時の親カテゴリ名" }
                },
                required: ["type", "value"]
            }
        }
    ],
}));

// 2. ツール実行ハンドラー
mcpServer.setRequestHandler(CallToolRequestSchema, async (request) => {
    const interests = JSON.parse(fs.readFileSync(INTERESTS_PATH, 'utf8'));
    
    switch (request.params.name) {
        case "get_gadget_dashboard": {
            const data = await scraper.getDashboard(interests);
            return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
        }
        
        case "get_gemini_picks": {
            const data = await scraper.getRecommendations(interests);
            return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
        }
        
        case "add_gadget_interest": {
            const { type, value, name } = request.params.arguments;
            updateInterestsFile(type, value, name);
            return { content: [{ type: "text", text: `興味リストに「${value}」を追加しました。次回以降のスクレイピングに反映されます。` }] };
        }

        default:
            throw new Error(`Tool not found: ${request.params.name}`);
    }
});

/**
 * ==========================================
 * HTTP API / Dashboard Server 設定
 * ==========================================
 */
const app = express();
const PORT = process.env.PORT || 3005;

// セキュリティ & ミドルウェア
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 100,
    message: { error: "リクエスト制限を超過しました。しばらく待ってから再試行してください。" }
});

app.use(cors({
    origin: ['http://localhost:3005', 'http://127.0.0.1:3005'],
    methods: ['GET', 'POST']
}));
app.use(express.json());

// 静的ファイルの配信 (Dashboard UI)
const dashboardPath = path.join(__dirname, 'dashboard');
app.use(express.static(dashboardPath));

// APIエンドポイント
app.get('/api/dashboard', limiter, async (req, res) => {
    try {
        const interests = JSON.parse(fs.readFileSync(INTERESTS_PATH, 'utf8'));
        const data = await scraper.getDashboard(interests);
        res.json(data);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.get('/api/recommend', limiter, async (req, res) => {
    try {
        const interests = JSON.parse(fs.readFileSync(INTERESTS_PATH, 'utf8'));
        const data = await scraper.getRecommendations(interests);
        res.json(data);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.post('/api/update-interests', async (req, res) => {
    try {
        const { type, value, name } = req.body;
        updateInterestsFile(type, value, name);
        res.json({ status: 'success', message: 'Interests updated' });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// ルートアクセスをUIへ誘導
app.get('*', (req, res) => {
    if (req.path.startsWith('/api/')) return res.status(404).json({ error: "API Not Found" });
    res.sendFile(path.join(dashboardPath, 'index.html'));
});

/**
 * 興味データを保存しているJSONファイルを物理的に更新する
 */
function updateInterestsFile(type, value, name) {
    const data = JSON.parse(fs.readFileSync(INTERESTS_PATH, 'utf8'));
    
    if (type === 'category') {
        if (!data.categories[value]) {
            data.categories[value] = { brands: [], keywords: [], score: 5 };
        }
    } else if (type === 'keyword' || type === 'brand') {
        const target = name || 'ガジェット';
        if (!data.categories[target]) {
            data.categories[target] = { brands: [], keywords: [], score: 5 };
        }
        const list = type === 'keyword' ? data.categories[target].keywords : data.categories[target].brands;
        if (!list.includes(value)) list.push(value);
    }
    
    fs.writeFileSync(INTERESTS_PATH, JSON.stringify(data, null, 2));
    console.log(`[Config] Interests updated: ${type} -> ${value}`);
}

// サーバー起動
const transport = new StdioServerTransport();
mcpServer.connect(transport).catch(error => {
    console.error("[MCP] Connection error:", error);
});

app.listen(PORT, () => {
    console.log(`[HTTP] Server is running on http://localhost:${PORT}`);
    console.log(`[MCP] Standard I/O transport is active.`);
});