import type { FastifyPluginAsync, FastifyRequest, FastifyReply } from 'fastify';
import { SettingsManager } from '../../services/SettingsManager';
import { SyncSettingsSchema, type Interests, type FeedConfig, type UiSettings, type UsageStats } from '../../models/Schemas';
import { NexusOrchestrator } from '../../core/NexusOrchestrator';
import { ScraperFacade } from '../../ScraperFacade';
import { DiscoveryService } from '../../services/DiscoveryService';

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
        scraper.feedManager.config = result.validatedFeedConfig;
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
      const apiKey = await settingsManager.getApiKey();
      scraper.updateApiKey(apiKey);

      return await scraper.geminiService.suggestCategoryDetails(categoryName);
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      reply.status(500).send({ error: 'Failed to generate suggestions', details: msg });
    }
  });

  /**
   * GET /api/v5/proposals
   */
  fastify.get('/proposals', async (_request: FastifyRequest, reply: FastifyReply) => {
    try {
      const apiKey = await settingsManager.getApiKey();
      evolution.updateApiKey(apiKey);

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
      const apiKey = await settingsManager.getApiKey();
      orchestrator.updateApiKey(apiKey);

      orchestrator.runAutonomousLoop(requirements).catch((err: Error) => {
        console.error('[Orchestrator Loop Error]', err);
      });
      return { status: 'accepted', message: 'Autonomous loop started' };
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      reply.status(500).send({ error: msg });
    }
  });

  /**
   * POST /api/v5/restructure-categories
   */
  fastify.post('/restructure-categories', async (_request: FastifyRequest, reply: FastifyReply) => {
    try {
      const apiKey = await settingsManager.getApiKey();
      scraper.updateApiKey(apiKey);

      const currentInterests = await settingsManager.getInterests();
      const currentFeeds = await settingsManager.getFeedConfig();

      const restructured = await scraper.geminiService.getRestructureProposal(currentInterests, currentFeeds);

      const validationTasks = Object.entries(restructured.feedConfig).map(async ([catName, config]) => {
        const sitesToValidate = config.active.map(url => ({ url, name: 'Suggested Feed', category: catName }));
        const validatedSites = await evolution.validateSuggestedFeeds(sitesToValidate);
        restructured.feedConfig[catName].active = validatedSites.map(s => s.url);

        if (restructured.feedConfig[catName].active.length === 0) {
          const fallbackUrl = `https://news.google.com/rss/search?q=${encodeURIComponent(catName)}&hl=ja&gl=JP&ceid=JP:ja`;
          restructured.feedConfig[catName].active.push(fallbackUrl);
        }
      });

      await Promise.all(validationTasks);
      return restructured;
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      reply.status(500).send({ error: 'Failed to restructure categories', details: msg });
    }
  });

  /**
   * POST /api/v5/translate-interests
   */
  fastify.post('/translate-interests', async (request: FastifyRequest<{ Body: { interests: Interests, feedConfig: FeedConfig } }>, reply: FastifyReply) => {
    try {
      const { interests, feedConfig } = request.body;
      const apiKey = await settingsManager.getApiKey();
      scraper.updateApiKey(apiKey);

      return await scraper.geminiService.translateInterests(interests, feedConfig);
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      reply.status(500).send({ error: 'Failed to translate interests', details: msg });
    }
  });

  /**
   * POST /api/v5/discover-trends
   */
  fastify.post('/discover-trends', async (_request: FastifyRequest, reply: FastifyReply) => {
    try {
      const apiKey = await settingsManager.getApiKey();
      scraper.updateApiKey(apiKey);

      const interests = await settingsManager.getInterests();
      const suggestions = await scraper.discoverTrends(interests);

      return { suggestions };
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      reply.status(500).send({ error: 'Failed to discover trends', details: msg });
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
   * GET /api/v5/ui-settings
   */
  fastify.get('/ui-settings', async (_request: FastifyRequest, reply: FastifyReply) => {
    try {
      return await settingsManager.getUiSettings();
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      reply.status(500).send({ error: 'Failed to retrieve UI settings', details: msg });
    }
  });

  /**
   * POST /api/v5/save-ui-settings
   */
  fastify.post('/save-ui-settings', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      await settingsManager.saveUiSettings(request.body as UiSettings);
      return { success: true };
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      reply.status(500).send({ error: 'Failed to save UI settings', details: msg });
    }
  });

  /**
   * GET /api/v5/usage-stats
   */
  fastify.get('/usage-stats', async (_request: FastifyRequest, reply: FastifyReply) => {
    try {
      return await settingsManager.getUsageManager().getStats();
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      reply.status(500).send({ error: 'Failed to retrieve usage stats', details: msg });
    }
  });

  /**
   * GET /api/v5/events
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

    // 利用統計の更新をSSEで通知
    const onUsageUpdated = (stats: UsageStats) => {
      const msg = JSON.stringify({ type: 'usage-updated', stats });
      reply.raw.write(`data: ${msg}\n\n`);
    };
    settingsManager.getUsageManager().on('usage-updated', onUsageUpdated);

    const initialMsg = JSON.stringify({ status: 'connected', message: 'SSE Connection Established', timestamp: new Date().toISOString() });
    reply.raw.write(`data: ${initialMsg}\n\n`);

    const keepAlive = setInterval(() => {
      reply.raw.write(': heartbeat\n\n');
    }, 30000);

    request.raw.on('close', () => {
      clearInterval(keepAlive);
      settingsManager.getUsageManager().off('usage-updated', onUsageUpdated);
    });
  });
};

export default nexusRouter;
