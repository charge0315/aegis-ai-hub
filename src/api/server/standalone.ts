import fastify from 'fastify';
import cors from '@fastify/cors';
import path from 'path';
import { nexusRouter } from './NexusRouter';
import { SettingsManager } from '../../services/SettingsManager';
import { ScraperFacade } from '../../ScraperFacade';
import { NexusOrchestrator } from '../../core/NexusOrchestrator';
import { DiscoveryService } from '../../services/DiscoveryService';
import { GeminiService } from '../../services/GeminiService';
import { RSSFetcher } from '../../services/RSSFetcher';
import { FeedManager } from '../../services/FeedManager';

async function start() {
  const app = fastify({ logger: true });
  await app.register(cors, { origin: '*' });

  const dataDir = path.resolve(process.cwd(), 'data');
  const settingsManager = new SettingsManager({ dataDir });
  await settingsManager.init();

  const apiKey = await settingsManager.getApiKey();
  const geminiService = new GeminiService(apiKey);
  const rssFetcher = new RSSFetcher();
  const feedManager = new FeedManager(path.join(dataDir, 'feed_config.json'));
  const discoveryService = new DiscoveryService(geminiService, rssFetcher, feedManager);
  
  const scraper = new ScraperFacade(
    path.join(dataDir, 'interests.json'),
    path.join(dataDir, 'feed_config.json'),
    dataDir
  );
  const orchestrator = new NexusOrchestrator(geminiService);

  // Register NexusRouter
  await app.register(nexusRouter, {
    prefix: '/api/v5',
    scraper,
    evolution: discoveryService,
    orchestrator,
    settingsManager
  });

  // Backward compatibility for dashboard
  app.get('/api/dashboard', async () => {
    const interests = await settingsManager.getInterests();
    return await scraper.getDashboard(interests);
  });

  const port = 3005;
  try {
    await app.listen({ port, host: '0.0.0.0' });
    console.log(`[Standalone] Fastify server listening on port ${port}`);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

start();
