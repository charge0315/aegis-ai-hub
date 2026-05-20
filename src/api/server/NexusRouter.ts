import type { FastifyInstance, FastifyPluginOptions, FastifyRequest, FastifyReply } from 'fastify';
import { SyncSettingsSchema } from '../../models/Schemas';
import { ZodError } from 'zod';
import type { NexusOrchestrator } from '../../core/NexusOrchestrator';
import type { ScraperFacade } from '../../ScraperFacade';
import type { DiscoveryService } from '../../services/DiscoveryService';
import type { SettingsManager } from '../../services/SettingsManager';
import type { NexusSettings, UiSettings } from '../../types';

interface NexusRouterOptions {
  scraper: ScraperFacade;
  evolution: DiscoveryService;
  orchestrator: NexusOrchestrator;
  settingsManager: SettingsManager;
}

export const nexusRouter = async (fastify: FastifyInstance, options: FastifyPluginOptions & NexusRouterOptions) => {
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
  fastify.post('/sync-settings', async (request: FastifyRequest<{ Body: NexusSettings }>, reply: FastifyReply) => {
    try {
      const validated = SyncSettingsSchema.parse(request.body);
      const result = await settingsManager.syncSettings(validated);

      if (scraper && scraper.feedManager) {
        scraper.feedManager.config = validated.feedConfig;
      }

      return result;
    } catch (error: unknown) {
      console.error('[NexusRouter] Sync Settings Error:', error);
      if (error instanceof ZodError) {
        reply.status(400).send({ error: 'Validation failed', issues: error.issues });
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
   * POST /api/v5/orchestrate
   */
  fastify.post('/orchestrate', async (request: FastifyRequest<{ Body: { requirements: string } }>, reply: FastifyReply) => {
    const { requirements } = request.body;
    if (!requirements) {
      reply.status(400).send({ error: 'Requirements are required' });
      return;
    }

    try {
      void orchestrator.runAutonomousLoop(requirements);
      return { status: 'accepted', message: 'Autonomous loop started' };
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      reply.status(500).send({ error: msg });
    }
  });

  /**
   * POST /api/v5/discover-trends
   */
  fastify.post('/discover-trends', async (_request, reply) => {
    try {
      const interests = await settingsManager.getInterests();
      const suggestions = await scraper.discoverTrends(interests);
      return { suggestions };
    } catch (error) {
      reply.status(500).send({ error: 'Failed to discover trends', details: String(error) });
    }
  });

  /**
   * POST /api/v5/restructure-categories
   */
  fastify.post('/restructure-categories', async (request: FastifyRequest<{ Body: { count?: number, language?: string } }>, reply: FastifyReply) => {
    try {
      const { count, language } = request.body;
      const interests = await settingsManager.getInterests();
      return await evolution.getRestructureProposal(interests, count, language || 'ja');
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      reply.status(500).send({ error: 'Failed to restructure categories', details: msg });
    }
  });

  /**
   * POST /api/v5/translate-interests
   */
  fastify.post('/translate-interests', async (request: FastifyRequest<{ Body: NexusSettings }>, reply: FastifyReply) => {
    try {
      const settings = request.body;
      return await evolution.translateInterests(settings.interests);
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      reply.status(500).send({ error: 'Failed to translate interests', details: msg });
    }
  });

  /**
   * POST /api/v5/reset-to-defaults
   */
  fastify.post('/reset-to-defaults', async (_request: FastifyRequest<{ Body: { language?: string } }>, reply: FastifyReply) => {
    try {
      const success = await settingsManager.resetToDefaults();
      return { success };
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      reply.status(500).send({ error: 'Failed to reset to defaults', details: msg });
    }
  });

  /**
   * GET /api/v5/ui-settings
   */
  fastify.get('/ui-settings', async () => {
    return await settingsManager.getUiSettings();
  });

  /**
   * POST /api/v5/save-ui-settings
   */
  fastify.post('/save-ui-settings', async (request: FastifyRequest<{ Body: UiSettings }>) => {
    return await settingsManager.saveUiSettings(request.body);
  });

  /**
   * GET /api/v5/usage-stats
   */
  fastify.get('/usage-stats', async () => {
    return await settingsManager.getUsageStats();
  });

  /**
   * GET /api/dashboard
   */
  fastify.get('/api/dashboard', async () => {
    const interests = await settingsManager.getInterests();
    return await scraper.getDashboard(interests);
  });

  /**
   * GET /api/v5/events (SSE)
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
