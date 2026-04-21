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
// Dockerコンテナ内では /app/gadget-interests.json にマウントされる
const INTERESTS_PATH = process.env.INTERESTS_PATH || path.join(__dirname, 'gadget-interests.json');

const mcpServer = new Server({
    name: "gadget-concierge-mcp",
    version: "1.0.0",
}, {
    capabilities: { tools: {} },
});

mcpServer.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
        tools: [
            {
                name: "get_gadget_dashboard",
                description: "Scrape and return latest gadget news JSON.",
                inputSchema: { type: "object", properties: {} }
            },
            {
                name: "add_gadget_interest",
                description: "Add a new category, brand, or keyword.",
                inputSchema: {
                    type: "object",
                    properties: {
                        type: { type: "string", enum: ["category", "keyword", "brand"] },
                        value: { type: "string" },
                        name: { type: "string" }
                    },
                    required: ["type", "value"]
                }
            }
        ],
    };
});

mcpServer.setRequestHandler(CallToolRequestSchema, async (request) => {
    const interests = JSON.parse(fs.readFileSync(INTERESTS_PATH, 'utf8'));
    if (request.params.name === "get_gadget_dashboard") {
        const data = await scrapeGadgetNews(interests);
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
    }
    if (request.params.name === "add_gadget_interest") {
        const { type, value, name } = request.params.arguments;
        updateInterestsFile(type, value, name);
        return { content: [{ type: "text", text: `Successfully added ${value}.` }] };
    }
    throw new Error("Tool not found");
});

const app = express();
app.use(cors());
app.use(express.json());

app.get('/dashboard', async (req, res) => {
    try {
        const interests = JSON.parse(fs.readFileSync(INTERESTS_PATH, 'utf8'));
        const data = await scrapeGadgetNews(interests);
        res.json(data);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/update', (req, res) => {
    try {
        updateInterestsFile(req.body.type, req.body.value, req.body.name);
        res.json({ status: 'success' });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

function updateInterestsFile(type, value, name) {
    const data = JSON.parse(fs.readFileSync(INTERESTS_PATH, 'utf8'));
    if (type === 'category') {
        if (!data.categories[value]) data.categories[value] = { brands: [], keywords: [], score: 5 };
    } else if (type === 'keyword' || type === 'brand') {
        const target = name || 'ガジェット全般';
        if (!data.categories[target]) data.categories[target] = { brands: [], keywords: [], score: 5 };
        const list = type === 'keyword' ? data.categories[target].keywords : data.categories[target].brands;
        if (!list.includes(value)) list.push(value);
    }
    fs.writeFileSync(INTERESTS_PATH, JSON.stringify(data, null, 2));
}

const transport = new StdioServerTransport();
mcpServer.connect(transport);
app.listen(3005, () => console.error(`API running on 3005`));