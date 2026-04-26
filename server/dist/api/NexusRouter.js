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
            if (error.name === 'ZodError') {
                reply.status(400).send({ error: 'Validation failed', issues: error.issues });
                return;
            }
            reply.status(500).send({ error: 'Failed to sync settings', details: error.message });
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
     * GET /api/v5/events
     * SSEによる進捗通知
     */
    fastify.get('/events', (request, reply) => {
        reply.raw.setHeader('Content-Type', 'text/event-stream');
        reply.raw.setHeader('Cache-Control', 'no-cache');
        reply.raw.setHeader('Connection', 'keep-alive');
        orchestrator.subscribe(reply);
        // 初回接続時の通知
        reply.raw.write(`data: ${JSON.stringify({ status: 'connected', message: 'SSE Connection Established' })}\n\n`);
    });
};
export default nexusRouter;
