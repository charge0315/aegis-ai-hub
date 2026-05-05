/**
 * @fileoverview Aegis AI Hub サーバーのエントリーポイント (v5.2 NEXUS)
 * 
 * 意図: Fastifyベースのスタンドアロンサーバーを起動し、
 * 各種AIエージェント、スクレイパー、およびAPIエンドポイントを統合・管理するためです。
 */

import Fastify from 'fastify';
import cors from '@fastify/cors';
import fastifyStatic from '@fastify/static';
import path from 'path';
import { fileURLToPath } from 'url';
import 'dotenv/config';

import { SettingsManager } from './services/SettingsManager';
import { ScraperFacade } from './ScraperFacade';
import { HealthMonitor } from './jobs/HealthMonitor';
import { DiscoveryService } from './services/DiscoveryService';
import { EvolutionJob } from './jobs/EvolutionJob';
import { NexusOrchestrator } from './core/NexusOrchestrator';
import nexusRouter from './api/NexusRouter';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = process.cwd();
const DATA_DIR = process.env.DATA_DIR || path.join(PROJECT_ROOT, 'data');

console.log(`[Server] Project Root: ${PROJECT_ROOT}`);
console.log(`[Server] Data Directory: ${DATA_DIR}`);

// コアサービスの初期化
// 意図: 設定管理、スクレイピング、AIによる発見・進化・オーケストレーションなどの主要コンポーネントを準備するためです。
const settingsManager = new SettingsManager({ dataDir: DATA_DIR });
const INTERESTS_PATH = path.join(DATA_DIR, 'interests.json');
const FEEDS_PATH = path.join(DATA_DIR, 'feed_config.json');

const scraper = new ScraperFacade(INTERESTS_PATH, FEEDS_PATH, DATA_DIR);
const discovery = new DiscoveryService(scraper.geminiService, scraper.rssFetcher, scraper.feedManager);
const evolution = new EvolutionJob(scraper, discovery, INTERESTS_PATH);
const orchestrator = new NexusOrchestrator(scraper.geminiService);

// バックグラウンド・ジョブの開始
// 意図: サーバーのメインロジックとは非同期に、定期的なフィード監視や正常性チェックを自動実行するためです。
const monitor = new HealthMonitor(scraper.feedManager);
monitor.start();

const fastify = Fastify({
  logger: true
});

const PORT = Number(process.env.PORT) || 3005;

async function startServer() {
  try {
    await settingsManager.init();
    await fastify.register(cors);

    // 静的ファイルの配信 (dashboard)
    const dashboardPath = path.join(PROJECT_ROOT, 'dashboard', 'dist');

    await fastify.register(fastifyStatic, {
      root: dashboardPath,
      prefix: '/',
      wildcard: true,
      setHeaders: (res, filePath) => {
        if (filePath.endsWith('.js')) {
          res.setHeader('Content-Type', 'application/javascript');
        }
      }
    });

    // API Router (v5.2)
    await fastify.register(nexusRouter, {
      prefix: '/api/v5',
      scraper,
      evolution: discovery,
      orchestrator,
      settingsManager
    });

    // Legacy API routes
    fastify.get('/api/dashboard', async () => {
      const interests = await settingsManager.getInterests();
      return scraper.getDashboard(interests);
    });

    fastify.get('/api/recommend', async () => {
      const interests = await settingsManager.getInterests();
      return scraper.getRecommendations(interests);
    });

    fastify.get('/api/evolution-proposals', async () => {
      const interests = await settingsManager.getInterests();
      return discovery.getProposals(interests);
    });

    fastify.get('/api/restructure-proposals', async () => {
      const interests = await settingsManager.getInterests();
      return scraper.geminiService.getRestructureProposal(interests);
    });

    // SPA fallback
    fastify.setNotFoundHandler((request, reply) => {
      if (request.url.startsWith('/api/') || request.url.startsWith('/assets/')) {
        reply.status(404).send({ error: 'Not Found' });
        return;
      }
      reply.sendFile('index.html');
    });

    await fastify.listen({ port: PORT, host: '0.0.0.0' });
    console.log(`[Nexus v5.2] Server is running on http://localhost:${PORT}`);

  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
}

startServer();
