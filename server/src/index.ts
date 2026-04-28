/**
 * Aegis AI Hub - Server Entry Point (v5.0 Nexus)
 * Fastify based implementation with MCP support.
 */

import Fastify from 'fastify';
import cors from '@fastify/cors';
import fastifyStatic from '@fastify/static';
import path from 'path';
import { fileURLToPath } from 'url';
import 'dotenv/config';

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";

import { ScraperFacade } from './ScraperFacade.js';
import { HealthMonitor } from './jobs/HealthMonitor.js';
import { DiscoveryService } from './services/DiscoveryService.js';
import { EvolutionJob } from './jobs/EvolutionJob.js';
import { NexusOrchestrator } from './core/NexusOrchestrator.js';

import SettingsManager from './services/SettingsManager.js';
import nexusRouter from './api/NexusRouter.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// In Docker, __dirname might be /app/dist (if compiled) or /app/src (if ts-node)
// Let's make PROJECT_ROOT more robust
const PROJECT_ROOT = process.cwd(); 
const INTERESTS_PATH = process.env.INTERESTS_PATH || path.join(PROJECT_ROOT, 'data', 'interests.json');
const FEEDS_PATH = process.env.FEEDS_PATH || path.join(PROJECT_ROOT, 'data', 'feed_config.json');

console.log(`[Server] Project Root: ${PROJECT_ROOT}`);
console.log(`[Server] Interests path: ${INTERESTS_PATH}`);
console.log(`[Server] Feeds path: ${FEEDS_PATH}`);

// コアサービスの初期化
const scraper = new ScraperFacade(INTERESTS_PATH, FEEDS_PATH);
const discovery = new DiscoveryService(scraper.geminiService, scraper.rssFetcher, scraper.feedManager);
const evolution = new EvolutionJob(scraper, discovery, INTERESTS_PATH);
const orchestrator = new NexusOrchestrator(scraper.geminiService);

// バックグラウンド・ジョブの開始
const monitor = new HealthMonitor(scraper.feedManager);
monitor.start();

const fastify = Fastify({
    logger: true
});

const PORT = Number(process.env.PORT) || 3005;

async function startServer() {
    try {
        await fastify.register(cors);
        
        // 静的ファイルの配信 (dashboard)
        const dashboardPath = path.join(PROJECT_ROOT, 'dashboard', 'dist');
        console.log(`[Server] Serving dashboard from: ${dashboardPath}`);
        
        await fastify.register(fastifyStatic, {
            root: dashboardPath,
            prefix: '/',
            wildcard: true,
            setHeaders: (res, path) => {
                if (path.endsWith('.js')) {
                    res.setHeader('Content-Type', 'application/javascript');
                }
            }
        });

        // API Router (v5)
        await fastify.register(nexusRouter, { 
            prefix: '/api/v5',
            scraper,
            evolution,
            orchestrator
        });

        // Legacy/Direct API routes
        fastify.get('/api/dashboard', async () => {
            const interests = await SettingsManager.getInterests();
            return scraper.getDashboard(interests);
        });

        fastify.get('/api/recommend', async () => {
            const interests = await SettingsManager.getInterests();
            return scraper.getRecommendations(interests);
        });

        fastify.get('/api/evolution-proposals', async () => {
            const interests = await SettingsManager.getInterests();
            return discovery.getProposals(interests);
        });

        fastify.get('/api/restructure-proposals', async () => {
            const interests = await SettingsManager.getInterests();
            return scraper.geminiService.getRestructureProposal(interests);
        });

        // SPA fallback
        fastify.setNotFoundHandler((request, reply) => {
            if (request.url.startsWith('/api/') || request.url.startsWith('/assets/')) {
                reply.status(404).send({ error: 'Not Found' });
                return;
            }
            reply.sendFile('index.html'); // This refers to dist/index.html
        });

        /**
         * MCP Server
         */
        const mcpServer = new Server(
            { name: "aegis-ai-hub-mcp", version: "5.0.0" },
            { capabilities: { tools: {} } }
        );

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
            } catch (error: any) {
                return {
                    isError: true,
                    content: [{ type: "text", text: `Error: ${error.message}` }]
                };
            }
        });

        const transport = new StdioServerTransport();
        mcpServer.connect(transport).catch(e => console.error("[MCP] Connection error:", e));

        await fastify.listen({ port: PORT, host: '0.0.0.0' });
        console.log(`[Nexus v5.0] Server is running on http://localhost:${PORT}`);

    } catch (err) {
        fastify.log.error(err);
        process.exit(1);
    }
}

startServer();
