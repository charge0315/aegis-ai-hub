import express from 'express';
import SettingsManager from '../services/SettingsManager.js';
import { SyncSettingsSchema } from '../models/Schemas.js';

/**
 * Create Nexus Router
 * @param {Object} dependencies - Core services like scraper, evolution job, orchestrator
 */
export function createNexusRouter({ scraper, evolution, orchestrator }) {
  const router = express.Router();

  /**
   * GET /api/v5/interests
   */
  router.get('/interests', async (req, res) => {
    try {
      const interests = await SettingsManager.getInterests();
      res.json(interests);
    } catch (error) {
      res.status(500).json({ error: 'Failed to retrieve interests', details: error.message });
    }
  });

  /**
   * GET /api/v5/feeds
   */
  router.get('/feeds', async (req, res) => {
    try {
      const feedConfig = await SettingsManager.getFeedConfig();
      res.json(feedConfig);
    } catch (error) {
      res.status(500).json({ error: 'Failed to retrieve feed configuration', details: error.message });
    }
  });

  /**
   * POST /api/v5/sync-settings
   */
  router.post('/sync-settings', async (req, res) => {
    try {
      // Validate request body
      const validated = SyncSettingsSchema.parse(req.body);
      
      // Perform sync (atomic file write + backup)
      const result = await SettingsManager.syncSettings(validated);
      
      // Refresh in-memory states of services
      if (scraper && scraper.feedManager) {
        scraper.feedManager.config = validated.feedConfig;
      }
      
      res.json(result);
    } catch (error) {
      if (error.name === 'ZodError') {
        return res.status(400).json({ error: 'Validation failed', issues: error.issues });
      }
      res.status(500).json({ error: 'Failed to sync settings', details: error.message });
    }
  });

  /**
   * POST /api/v5/orchestrate
   * 自律ループを開始
   */
  router.post('/orchestrate', async (req, res) => {
    const { requirements } = req.body;
    if (!requirements) {
      return res.status(400).json({ error: 'Requirements are required' });
    }

    try {
      // 非同期でループを開始
      orchestrator.runAutonomousLoop(requirements).catch(err => {
        console.error('[Orchestrator Loop Error]', err);
      });
      res.json({ status: 'accepted', message: 'Autonomous loop started' });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * GET /api/v5/events
   * SSEによる進捗通知
   */
  router.get('/events', (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    orchestrator.subscribe(res);
    
    // 初回接続時の通知
    res.write(`data: ${JSON.stringify({ status: 'connected', message: 'SSE Connection Established' })}\n\n`);
  });

  return router;
}

export default createNexusRouter;
