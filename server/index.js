import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { scrapeGadgetNews } from './scraper.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// 永続化データのパス設定
const INTERESTS_PATH = process.env.INTERESTS_PATH || path.join(__dirname, 'gadget-interests.json');
const FEEDS_PATH = process.env.FEEDS_PATH || path.join(__dirname, 'feed-config.json');

/**
 * MCP (Model Context Protocol) サーバーの設定
 */
const mcpServer = new Server({
    name: "gadget-concierge-mcp",
    version: "1.0.0",
}, {
    capabilities: { tools: {} },
});

// 利用可能なツールの定義
mcpServer.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
        tools: [
            {
                name: "get_gadget_dashboard",
                description: "最新のガジェットニュースをスクレイピングしてJSON形式で返します。みつひでさんの興味に基づいてパーソナライズされます。",
                inputSchema: { type: "object", properties: {} }
            },
            {
                name: "add_gadget_interest",
                description: "新しいカテゴリ、ブランド、またはキーワードをみつひでさんの興味リストに追加します。",
                inputSchema: {
                    type: "object",
                    properties: {
                        type: { type: "string", enum: ["category", "keyword", "brand"], description: "追加する項目の種類" },
                        value: { type: "string", description: "具体的な名称（例: Minisforum）" },
                        name: { type: "string", description: "キーワードを追加する際の親カテゴリ名" }
                    },
                    required: ["type", "value"]
                }
            }
        ],
    };
});

// ツール実行時のハンドラー
mcpServer.setRequestHandler(CallToolRequestSchema, async (request) => {
    const interests = JSON.parse(fs.readFileSync(INTERESTS_PATH, 'utf8'));
    
    // ダッシュボード情報の取得リクエスト
    if (request.params.name === "get_gadget_dashboard") {
        const data = await scrapeGadgetNews(interests, FEEDS_PATH);
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
    }
    
    // 興味の追加リクエスト
    if (request.params.name === "add_gadget_interest") {
        const { type, value, name } = request.params.arguments;
        updateInterestsFile(type, value, name);
        return { content: [{ type: "text", text: `みつひでさんの興味に「${value}」を学習しました。` }] };
    }

    throw new Error("指定されたツールが見つかりません。");
});

/**
 * HTTP API サーバーの設定
 */
const app = express();
app.use(cors());
app.use(express.json());

// 最新情報を取得して返すエンドポイント
app.get('/dashboard', async (req, res) => {
    try {
        const interests = JSON.parse(fs.readFileSync(INTERESTS_PATH, 'utf8'));
        const data = await scrapeGadgetNews(interests, FEEDS_PATH);
        res.json(data);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// 興味を更新するエンドポイント
app.post('/update', (req, res) => {
    try {
        updateInterestsFile(req.body.type, req.body.value, req.body.name);
        res.json({ status: 'success' });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

/**
 * 興味データを保存しているJSONファイルを物理的に更新する
 */
function updateInterestsFile(type, value, name) {
    const data = JSON.parse(fs.readFileSync(INTERESTS_PATH, 'utf8'));
    if (type === 'category') {
        if (!data.categories[value]) data.categories[value] = { brands: [], keywords: [], score: 5 };
    } else if (type === 'keyword' || type === 'brand') {
        const target = name || 'ガジェット';
        if (!data.categories[target]) data.categories[target] = { brands: [], keywords: [], score: 5 };
        const list = type === 'keyword' ? data.categories[target].keywords : data.categories[target].brands;
        if (!list.includes(value)) list.push(value);
    }
    fs.writeFileSync(INTERESTS_PATH, JSON.stringify(data, null, 2));
}

// MCP stdio 通信の開始
const transport = new StdioServerTransport();
mcpServer.connect(transport);

// HTTP API をポート3005で待機開始
app.listen(3005, () => console.error(`ガジェットコンシェルジュAPI：ポート3005で稼働中`));