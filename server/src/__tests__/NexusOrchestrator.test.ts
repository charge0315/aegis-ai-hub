import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NexusOrchestrator } from '../core/NexusOrchestrator';
import { GeminiService } from '../services/GeminiService';
import { ArchitectAgent } from '../agents/ArchitectAgent';

// Mock agents and services
vi.mock('../services/GeminiService');
vi.mock('../agents/ArchitectAgent');
vi.mock('../agents/CuratorAgent');
vi.mock('../agents/DiscoveryAgent');
vi.mock('../agents/ArchivistAgent');

describe('NexusOrchestrator', () => {
  let orchestrator: NexusOrchestrator;
  let mockGeminiService: any;
  let mockRes: any;

  beforeEach(() => {
    vi.clearAllMocks();
    // GeminiService is mocked, so we can just instantiate it
    mockGeminiService = new (GeminiService as any)();
    orchestrator = new NexusOrchestrator(mockGeminiService);

    // Mock Fastify-like response object
    mockRes = {
      write: vi.fn(),
      on: vi.fn(),
      raw: {
        write: vi.fn(),
        on: vi.fn()
      }
    };
  });

  it('should subscribe and notify subscribers', () => {
    orchestrator.subscribe(mockRes);
    orchestrator.notify({ status: 'test', message: 'hello' });

    // In NexusOrchestrator, it prefers res.raw.write if available
    expect(mockRes.raw.write).toHaveBeenCalledWith(expect.stringContaining('"status":"test"'));
    expect(mockRes.raw.write).toHaveBeenCalledWith(expect.stringContaining('"message":"hello"'));
  });

  it('should run autonomous loop and notify progress', async () => {
    const mockPlan = {
      steps: [
        { agent: 'Curator', action: 'curate' }
      ]
    };

    // ArchitectAgent is mocked, so we mock the plan method on the prototype
    vi.mocked(ArchitectAgent.prototype.plan).mockResolvedValue(mockPlan as any);

    orchestrator.subscribe(mockRes);
    await orchestrator.runAutonomousLoop('test requirements');

    // Check progress notifications (using stringContaining to be flexible with JSON formatting)
    expect(mockRes.raw.write).toHaveBeenCalledWith(expect.stringContaining('"status":"working"'));
    expect(mockRes.raw.write).toHaveBeenCalledWith(expect.stringContaining('"status":"success"'));
    expect(mockRes.raw.write).toHaveBeenCalledWith(expect.stringContaining('"status":"idle"'));
    expect(mockRes.raw.write).toHaveBeenCalledWith(expect.stringContaining('"status":"refresh"'));
  });

  it('should handle errors and notify error status', async () => {
    vi.mocked(ArchitectAgent.prototype.plan).mockRejectedValue(new Error('Planning failed'));

    orchestrator.subscribe(mockRes);
    await orchestrator.runAutonomousLoop('test requirements');

    expect(mockRes.raw.write).toHaveBeenCalledWith(expect.stringContaining('"status":"error"'));
    expect(mockRes.raw.write).toHaveBeenCalledWith(expect.stringContaining('Planning failed'));
    // Should still transition to idle
    expect(mockRes.raw.write).toHaveBeenCalledWith(expect.stringContaining('"status":"idle"'));
  });

  it('should prevent concurrent runs', async () => {
    const mockPlan = { steps: [] };
    vi.mocked(ArchitectAgent.prototype.plan).mockReturnValue(new Promise(resolve => setTimeout(() => resolve(mockPlan as any), 50)));

    const firstRun = orchestrator.runAutonomousLoop('req 1');

    // Attempting second run while first is active should throw
    await expect(orchestrator.runAutonomousLoop('req 2')).rejects.toThrow('Orchestrator is already running.');

    await firstRun;
  });
});
