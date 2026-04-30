import SettingsManager from '../services/SettingsManager.js';
import { SyncSettingsSchema } from '../models/Schemas.js';
export const nexusRouter = async (fastify, options) => {
    const { scraper, evolution, orchestrator } = options;
    /**
     * GET /api/v5/interests
     */
    fastify.get('/interests', async (request, reply) => {
        try {
            const interests = await SettingsManager.getInterests();
            return interests;
        }
        catch (error) {
            reply.status(500).send({ error: 'Failed to retrieve interests', details: error.message });
        }
    });
    /**
     * GET /api/v5/feeds
     */
    fastify.get('/feeds', async (request, reply) => {
        try {
            const feedConfig = await SettingsManager.getFeedConfig();
            return feedConfig;
        }
        catch (error) {
            reply.status(500).send({ error: 'Failed to retrieve feed configuration', details: error.message });
        }
    });
    /**
     * POST /api/v5/sync-settings
     */
    fastify.post('/sync-settings', async (request, reply) => {
        try {
            // Validate request body
            const validated = SyncSettingsSchema.parse(request.body);
            // Perform sync (atomic file write + backup)
            const result = await SettingsManager.syncSettings(validated);
            // Refresh in-memory states of services
            if (scraper && scraper.feedManager) {
                scraper.feedManager.config = validated.feedConfig;
            }
            return result;
        }
        catch (error) {
            console.error('[NexusRouter] Sync Settings Error:', error); // Log to server console
            if (error.name === 'ZodError') {
                reply.status(400).send({ error: 'Validation failed', issues: error.issues });
                return;
            }
            reply.status(500).send({ error: 'Failed to sync settings', details: error.message });
        }
    });
    /**
     * POST /api/v5/suggest-category
     * カテゴリ名から提案を生成
     */
    fastify.post('/suggest-category', async (request, reply) => {
        const { categoryName } = request.body;
        if (!categoryName) {
            reply.status(400).send({ error: 'Category name is required' });
            return;
        }
        try {
            const suggestions = await scraper.geminiService.suggestCategoryDetails(categoryName);
            return suggestions;
        }
        catch (error) {
            console.error('[NexusRouter] Suggest Category Error:', error);
            reply.status(500).send({ error: 'Failed to generate suggestions', details: error.message });
        }
    });
    /**
     * POST /api/v5/orchestrate
     * 自律ループを開始
     */
    fastify.post('/orchestrate', async (request, reply) => {
        const { requirements } = request.body;
        if (!requirements) {
            reply.status(400).send({ error: 'Requirements are required' });
            return;
        }
        try {
            // 非同期でループを開始
            orchestrator.runAutonomousLoop(requirements).catch(err => {
                console.error('[Orchestrator Loop Error]', err);
            });
            return { status: 'accepted', message: 'Autonomous loop started' };
        }
        catch (error) {
            reply.status(500).send({ error: error.message });
        }
    });
    /**
     * GET /api/v5/window-state
     */
    fastify.get('/window-state', async (request, reply) => {
        try {
            const state = await SettingsManager.getWindowState();
            return state || { error: 'Not Found' };
        }
        catch (error) {
            reply.status(500).send({ error: 'Failed to retrieve window state' });
        }
    });
    /**
     * GET /api/v5/events
     * SSEによる進捗通知
     */
    fastify.get('/events', (request, reply) => {
        const headers = {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
            'Access-Control-Allow-Origin': '*'
        };
        reply.raw.writeHead(200, headers);
        reply.raw.write('\n'); // Send initial padding
        orchestrator.subscribe(reply);
        // 初回接続時の通知
        const initialMsg = JSON.stringify({ status: 'connected', message: 'SSE Connection Established', timestamp: new Date().toISOString() });
        reply.raw.write(`data: ${initialMsg}\n\n`);
        // Keep connection alive with heartbeat
        const keepAlive = setInterval(() => {
            reply.raw.write(': heartbeat\n\n');
        }, 30000);
        request.raw.on('close', () => {
            clearInterval(keepAlive);
        });
    });
};
export default nexusRouter;
