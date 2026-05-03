import { FastifyPluginAsync, FastifyRequest, FastifyReply } from 'fastify';
import { SettingsManager } from '../services/SettingsManager.js';
import { SyncSettingsSchema } from '../models/Schemas.js';
import { NexusOrchestrator } from '../core/NexusOrchestrator.js';
import { ScraperFacade } from '../ScraperFacade.js';
import { DiscoveryService } from '../services/DiscoveryService.js';

interface NexusRouterOptions {
  scraper: ScraperFacade;
  evolution: DiscoveryService;
  orchestrator: NexusOrchestrator;
  settingsManager: SettingsManager;
}

export const nexusRouter: FastifyPluginAsync<NexusRouterOptions> = async (fastify, options) => {
  const { scraper, evolution, orchestrator, settingsManager } = options;

  /**
   * GET /api/v5/interests
   */
  fastify.get('/interests', async (_request: FastifyRequest, reply: FastifyReply) => {
    try {
      return await settingsManager.getInterests();
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      reply.status(500).send({ error: 'Failed to retrieve interests', details: msg });
    }
  });

  /**
   * GET /api/v5/feeds
   */
  fastify.get('/feeds', async (_request: FastifyRequest, reply: FastifyReply) => {
    try {
      return await settingsManager.getFeedConfig();
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      reply.status(500).send({ error: 'Failed to retrieve feed configuration', details: msg });
    }
  });

  /**
   * POST /api/v5/sync-settings
   */
  fastify.post('/sync-settings', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const validated = SyncSettingsSchema.parse(request.body);
      const result = await settingsManager.syncSettings(validated);

      // Refresh in-memory states of services
      if (scraper && scraper.feedManager) {
        scraper.feedManager.config = validated.feedConfig;
      }

      return result;
    } catch (error: unknown) {
      console.error('[NexusRouter] Sync Settings Error:', error);
      if (error && typeof error === 'object' && 'name' in error && error.name === 'ZodError') {
        const zodError = error as unknown as { issues: unknown[] };
        reply.status(400).send({ error: 'Validation failed', issues: zodError.issues });
        return;
      }
      const msg = error instanceof Error ? error.message : String(error);
      reply.status(500).send({ error: 'Failed to sync settings', details: msg });
    }
  });

  /**
   * POST /api/v5/suggest-category
   */
  fastify.post('/suggest-category', async (request: FastifyRequest<{ Body: { categoryName: string } }>, reply: FastifyReply) => {
    const { categoryName } = request.body;
    if (!categoryName) {
      reply.status(400).send({ error: 'Category name is required' });
      return;
    }

    try {
      return await scraper.geminiService.suggestCategoryDetails(categoryName);
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      reply.status(500).send({ error: 'Failed to generate suggestions', details: msg });
    }
  });

  /**
   * GET /api/v5/proposals
   * AIによる進化提案を取得
   */
  fastify.get('/proposals', async (_request: FastifyRequest, reply: FastifyReply) => {
    try {
      const interests = await settingsManager.getInterests();
      return await evolution.getProposals(interests);
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      reply.status(500).send({ error: 'Failed to get proposals', details: msg });
    }
  });

  /**
   * POST /api/v5/orchestrate
   */
  fastify.post('/orchestrate', async (request: FastifyRequest<{ Body: { requirements: string } }>, reply: FastifyReply) => {
    const { requirements } = request.body;
    if (!requirements) {
      reply.status(400).send({ error: 'Requirements are required' });
      return;
    }

    try {
      orchestrator.runAutonomousLoop(requirements).catch(err => {
        console.error('[Orchestrator Loop Error]', err);
      });
      return { status: 'accepted', message: 'Autonomous loop started' };
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      reply.status(500).send({ error: msg });
    }
  });

  /**
   * GET /api/v5/window-state
   */
  fastify.get('/window-state', async (_request: FastifyRequest, reply: FastifyReply) => {
    try {
      const state = await settingsManager.getWindowState();
      return state || { error: 'Not Found' };
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      reply.status(500).send({ error: 'Failed to retrieve window state', details: msg });
    }
  });

  /**
   * GET /api/v5/events
   * SSEによる進捗通知
   */
  fastify.get('/events', (request: FastifyRequest, reply: FastifyReply) => {
    const headers = {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*'
    };
    reply.raw.writeHead(200, headers);
    reply.raw.write('\n');

    orchestrator.subscribe(reply);

    const initialMsg = JSON.stringify({ status: 'connected', message: 'SSE Connection Established', timestamp: new Date().toISOString() });
    reply.raw.write(`data: ${initialMsg}\n\n`);

    const keepAlive = setInterval(() => {
      reply.raw.write(': heartbeat\n\n');
    }, 30000);

    request.raw.on('close', () => {
      clearInterval(keepAlive);
    });
  });
};

export default nexusRouter;
