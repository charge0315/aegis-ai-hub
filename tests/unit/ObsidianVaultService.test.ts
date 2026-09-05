import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import { ObsidianVaultService } from '../../src/services/ObsidianVaultService';
import { Article } from '../../src/models/Article';

describe('ObsidianVaultService', () => {
  let tempVaultDir: string;
  let service: ObsidianVaultService;

  beforeEach(async () => {
    // 一時テストディレクトリの作成
    tempVaultDir = await fs.mkdtemp(path.join(os.tmpdir(), 'obsidian-test-'));
    service = new ObsidianVaultService(tempVaultDir);

    // テスト用の既存ノートを作成
    await fs.writeFile(
      path.join(tempVaultDir, 'Gemini_Overview.md'),
      '# Gemini Overview\n\nGoogle Gemini 3.5 and LLM AI technology insights.\n#AI #Gemini',
      'utf-8'
    );
    await fs.writeFile(
      path.join(tempVaultDir, 'React_Performance.md'),
      '# React Performance Tuning\n\nTips on React virtual DOM and state management.\n#React #Frontend',
      'utf-8'
    );
  });

  afterEach(async () => {
    // クリーニング
    try {
      await fs.rm(tempVaultDir, { recursive: true, force: true });
    } catch {
      // ignore
    }
  });

  describe('indexVaultNotes', () => {
    it('should index existing markdown files in the vault', async () => {
      const index = await service.indexVaultNotes();
      expect(index).toHaveLength(2);
      const titles = index.map(i => i.title);
      expect(titles).toContain('Gemini_Overview');
      expect(titles).toContain('React_Performance');
    });
  });

  describe('findRelatedNotes', () => {
    it('should match related notes based on keywords and title', async () => {
      const index = await service.indexVaultNotes();
      const related = service.findRelatedNotes(
        'Gemini 3.6 Released by Google',
        'AI & ML',
        'Google announced new Gemini LLM model with high performance.',
        index
      );

      expect(related.length).toBeGreaterThan(0);
      expect(related[0].title).toBe('Gemini_Overview');
    });
  });

  describe('exportArticle', () => {
    it('should export article to News/{Category} folder as markdown note', async () => {
      const article = new Article({
        title: 'New AI Breakthrough in 2026',
        link: 'https://example.com/news/ai-2026',
        desc: 'A major breakthrough in artificial intelligence models.',
        brand: 'TechCrunch',
        score: 95,
        category: 'AI & Tech',
        date: '2026-09-03T00:00:00.000Z',
        img: null,
        language: 'en'
      });

      const savedPath = await service.exportArticle(article);
      expect(savedPath).not.toBeNull();
      expect(savedPath).toContain('News');
      expect(savedPath).toContain('AI & Tech');

      // 保存されたファイル内容の検証
      const content = await fs.readFile(savedPath!, 'utf-8');
      expect(content).toContain('title: "New AI Breakthrough in 2026"');
      expect(content).toContain('source: "https://example.com/news/ai-2026"');
      expect(content).toContain('# New AI Breakthrough in 2026');
      expect(content).toContain('## 概要');
      expect(content).toContain('## 関連ノート');
      expect(content).toContain('## 情報源');
    });

    it('should link related notes with WikiLink format', async () => {
      const article = new Article({
        title: 'Gemini Next Generation Models',
        link: 'https://example.com/news/gemini-next',
        desc: 'Detailed discussion on Gemini LLM capabilities.',
        brand: 'AI News',
        score: 90,
        category: 'AI',
        date: '2026-09-03T00:00:00.000Z',
        img: null,
        language: 'en'
      });

      const savedPath = await service.exportArticle(article);
      expect(savedPath).not.toBeNull();

      const content = await fs.readFile(savedPath!, 'utf-8');
      expect(content).toContain('[[Gemini_Overview]]');
    });
  });

  describe('exportArticles', () => {
    it('should export multiple articles to Obsidian Vault', async () => {
      const articles = [
        new Article({
          title: 'Article 1',
          link: 'https://example.com/1',
          desc: 'Desc 1',
          brand: 'Brand',
          score: 80,
          category: 'Category 1',
          date: new Date().toISOString(),
          img: null,
          language: 'ja'
        }),
        new Article({
          title: 'Article 2',
          link: 'https://example.com/2',
          desc: 'Desc 2',
          brand: 'Brand',
          score: 85,
          category: 'Category 2',
          date: new Date().toISOString(),
          img: null,
          language: 'ja'
        })
      ];

      const savedPaths = await service.exportArticles(articles);
      expect(savedPaths).toHaveLength(2);
    });
  });

  describe('exportArticlesViaKbCreator', () => {
    it('should return false if articles array is empty', async () => {
      const result = await service.exportArticlesViaKbCreator([]);
      expect(result).toBe(false);
    });
  });
});
