/**
 * Aegis AI Hub - Server Entry Point (v5.0 Nexus)
 * MCP (Model Context Protocol) と HTTP API を通じてパーソナライズされたニュースを提供します。
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { rateLimit } from 'express-rate-limit';
import 'dotenv/config';

import { ScraperFacade } from './src/ScraperFacade.js';
import { HealthMonitor } from './src/jobs/HealthMonitor.js';
import { DiscoveryService } from './src/services/DiscoveryService.js';
import { EvolutionJob } from './src/jobs/EvolutionJob.js';

// v5.0 Additions
import SettingsManager from './src/services/SettingsManager.js';
import createNexusRouter from './src/api/NexusRouter.js';

// --- 初期設定とパス構成 ---
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const INTERESTS_PATH = process.env.INTERESTS_PATH || path.join(__dirname, 'data', 'interests.json');
const FEEDS_PATH = process.env.FEEDS_PATH || path.join(__dirname, 'data', 'feed_config.json');

// コアサービスの初期化
const scraper = new ScraperFacade(INTERESTS_PATH, FEEDS_PATH);
const discovery = new DiscoveryService(scraper.geminiService, scraper.rssFetcher, scraper.feedManager);
const evolution = new EvolutionJob(scraper, discovery, INTERESTS_PATH);

// バックグラウンド・ジョブの開始
const monitor = new HealthMonitor(scraper.feedManager);
monitor.start();

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
    message: { error: "リクエスト制限を超過しました。" }
});

app.use(cors());
app.use(express.json());

// API Router の構築
const apiRouter = express.Router();

// --- Nexus API (v5.0) ---
app.use('/api/v5', createNexusRouter({ scraper, evolution }));

// --- Legacy & Dashboard API (Refactored) ---

// ダッシュボード & 推薦 (制限あり)
apiRouter.get('/dashboard', limiter, async (req, res) => {
    try {
        const interests = await SettingsManager.getInterests();
        const data = await scraper.getDashboard(interests);
        res.json(data);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

apiRouter.get('/recommend', limiter, async (req, res) => {
    try {
        const interests = await SettingsManager.getInterests();
        const data = await scraper.getRecommendations(interests);
        res.json(data);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// AI提案 (制限あり)
apiRouter.get('/evolution-proposals', limiter, async (req, res) => {
    try {
        const interests = await SettingsManager.getInterests();
        const proposals = await discovery.getProposals(interests);
        res.json(proposals);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

apiRouter.get('/restructure-proposals', limiter, async (req, res) => {
    try {
        const interests = await SettingsManager.getInterests();
        const proposal = await scraper.geminiService.getRestructureProposal(interests);
        res.json(proposal);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// API をマウント
app.use('/api', apiRouter);

// 静的ファイルの配信
const dashboardPath = path.join(__dirname, 'dashboard');
app.use(express.static(dashboardPath));

// SPA 用のワイルドカード
app.get('*', (req, res) => {
    if (req.path.startsWith('/api/')) return res.status(404).json({ error: "API Not Found" });
    res.sendFile(path.join(dashboardPath, 'index.html'));
});

/**
 * ==========================================
 * MCP (Model Context Protocol) サーバー設定
 * ==========================================
 */
const mcpServer = new Server(
    { name: "aegis-ai-hub-mcp", version: "5.0.0" },
    { capabilities: { tools: {} } }
);

// 工具（Tools）の一覧を定義
mcpServer.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: [
        {
            name: "get_aegis_dashboard",
            description: "最新のパーソナライズされたニュースをスクレイピングしてJSON形式で返します。",
            inputSchema: { type: "object", properties: {} }
        },
        {
            name: "get_gemini_picks",
            description: "Gemini AIを使用して、厳密にキュレーションされた推奨記事を返します。",
            inputSchema: { type: "object", properties: {} }
        }
    ],
}));

// 工具の呼び出しを処理
mcpServer.setRequestHandler(CallToolRequestSchema, async (request) => {
    try {
        const interests = await SettingsManager.getInterests();
        const { name } = request.params;

        switch (name) {
            case "get_aegis_dashboard":
                const dashboard = await scraper.getDashboard(interests);
                return { content: [{ type: "text", text: JSON.stringify(dashboard, null, 2) }] };
            
            case "get_gemini_picks":
                const recommendations = await scraper.getRecommendations(interests);
                return { content: [{ type: "text", text: JSON.stringify(recommendations, null, 2) }] };
            
            default:
                return {
                    isError: true,
                    content: [{ type: "text", text: `Unknown tool: ${name}` }]
                };
        }
    } catch (error) {
        return {
            isError: true,
            content: [{ type: "text", text: `Error: ${error.message}` }]
        };
    }
});

// Stdioトランスポートで接続
const transport = new StdioServerTransport();
mcpServer.connect(transport).catch(e => console.error("[MCP] Connection error:", e));

/**
 * サーバー起動
 */
app.listen(PORT, () => {
    console.log(`[Nexus v5.0] Server is running on http://localhost:${PORT}`);
    console.log(`[Nexus v5.0] API v5 mounted at /api/v5`);
});
