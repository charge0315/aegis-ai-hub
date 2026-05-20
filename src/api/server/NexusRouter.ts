import type { FastifyInstance, FastifyPluginOptions } from 'fastify';

export const nexusRouter = async (fastify: FastifyInstance, options: FastifyPluginOptions) => {
  const { scraper, settingsManager } = options;

  fastify.get('/interests', async (_request, reply) => {
    try {
      return await settingsManager.getInterests();
    } catch (error) {
      reply.status(500).send({ error: 'Failed to retrieve interests', details: String(error) });
    }
  });

  fastify.get('/feeds', async (_request, reply) => {
    try {
      return await settingsManager.getFeedConfig();
    } catch (error) {
      reply.status(500).send({ error: 'Failed to retrieve feed config', details: String(error) });
    }
  });

  fastify.post('/sync-settings', async (request, reply) => {
    try {
      const result = await settingsManager.syncSettings(request.body);
      return result;
    } catch (error) {
      console.error('[NexusRouter] Sync Settings Error:', error);
      reply.status(500).send({ error: 'Failed to sync settings', details: String(error) });
    }
  });

  fastify.post('/discover-trends', async (_request, reply) => {
    try {
      const interests = await settingsManager.getInterests();
      const suggestions = await scraper.discoverTrends(interests);
      return { suggestions };
    } catch (error) {
      reply.status(500).send({ error: 'Failed to discover trends', details: String(error) });
    }
  });

  fastify.post('/restructure-categories', async (_request, reply) => {
    try {
      // 既存のメインプロセス側ロジックと重複するため簡略化
      return { categories: {}, feedConfig: {} };
    } catch (error) {
      reply.status(500).send({ error: 'Failed to restructure categories', details: String(error) });
    }
  });

  fastify.get('/ui-settings', async () => {
    return await settingsManager.getUiSettings();
  });

  fastify.post('/save-ui-settings', async (request) => {
    return await settingsManager.saveUiSettings(request.body);
  });

  fastify.get('/usage-stats', async () => {
    return await settingsManager.getUsageStats();
  });
};

export default nexusRouter;
