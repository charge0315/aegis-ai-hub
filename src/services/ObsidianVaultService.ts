import fs from 'fs/promises';
import path from 'path';
import { SchemaType, type ResponseSchema } from '@google/generative-ai';
import type { Article } from '../models/Article';
import type { GeminiService } from './GeminiService';
import type { ArchivistAgent } from '../agents/ArchivistAgent';

export interface ObsidianExportOptions {
  vaultPath?: string;
  overwrite?: boolean;
}

export interface NoteIndexItem {
  title: string;       // ノート名（拡張子なし）
  relativePath: string;
  tags: string[];
  keywords: string[];
}

export interface ArticleSummaryResult {
  summary: string;
  keyTakeaways: string[];
  tags: string[];
}

/**
 * ObsidianVaultService
 * 
 * フィードで取得したニュース記事をAI要約し、Obsidian Vault 内の News フォルダへ保存・更新する。
 * また、Vault 内の既存ノートを検索して WikiLink [[ノート名]] による自動紐づけを行う。
 */
export class ObsidianVaultService {
  private vaultPath: string;
  private geminiService?: GeminiService;
  private archivistAgent?: ArchivistAgent;
  private processedLinks: Set<string> = new Set();

  constructor(
    vaultPath: string = 'C:\\Users\\charg\\Documents\\Personal Space',
    geminiService?: GeminiService,
    archivistAgent?: ArchivistAgent
  ) {
    this.vaultPath = vaultPath;
    this.geminiService = geminiService;
    this.archivistAgent = archivistAgent;
  }

  public setVaultPath(vaultPath: string) {
    this.vaultPath = vaultPath;
  }

  public setGeminiService(geminiService: GeminiService) {
    this.geminiService = geminiService;
  }

  public setArchivistAgent(archivistAgent: ArchivistAgent) {
    this.archivistAgent = archivistAgent;
  }

  /**
   * Vault内の全Markdownファイルを走査してインデックスを作成する
   */
  async indexVaultNotes(): Promise<NoteIndexItem[]> {
    const index: NoteIndexItem[] = [];

    const scanDirectory = async (dir: string) => {
      try {
        const entries = await fs.readdir(dir, { withFileTypes: true });
        for (const entry of entries) {
          const fullPath = path.join(dir, entry.name);
          
          // 隠しフォルダ (.obsidian 等) や node_modules、ビルドディレクトリはスキップ
          if (entry.isDirectory()) {
            const dirName = entry.name.toLowerCase();
            if (entry.name.startsWith('.') || dirName === 'node_modules' || dirName === 'dist' || dirName === 'build') continue;
            await scanDirectory(fullPath);
          } else if (entry.isFile() && entry.name.endsWith('.md')) {
            const relPath = path.relative(this.vaultPath, fullPath);
            const title = path.basename(entry.name, '.md');
            
            // 簡単なタグ・キーワード抽出
            try {
              const content = await fs.readFile(fullPath, 'utf-8');
              const tags: string[] = [];
              const tagMatches = content.matchAll(/#([\w\-/\u3040-\u30FF\u4E00-\u9FAF]+)/g);
              for (const m of tagMatches) {
                if (m[1]) tags.push(m[1]);
              }

              // キーワード抽出（タイトルとヘッダーから）
              const headers = (content.match(/^#{1,6}\s+(.+)$/gm) || [])
                .map(h => h.replace(/^#{1,6}\s+/, ''));
              
              const keywords = [
                ...title.split(/[\s_\-–—/]+/),
                ...headers.flatMap(h => h.split(/[\s_\-–—/]+/))
              ].filter(k => k.length > 1);

              index.push({
                title,
                relativePath: relPath,
                tags,
                keywords
              });
            } catch {
              // 読み込み失敗時はタイトルのみ追加
              index.push({
                title,
                relativePath: relPath,
                tags: [],
                keywords: [title]
              });
            }
          }
        }
      } catch (err) {
        console.warn(`[ObsidianVaultService] Failed to scan dir ${dir}:`, err);
      }
    };

    try {
      await scanDirectory(this.vaultPath);
    } catch (err) {
      console.error('[ObsidianVaultService] Failed to index vault notes:', err);
    }

    return index;
  }

  /**
   * 記事のタイトル・カテゴリ・要約から既存ノートとの関連ノート（WikiLink候補）を特定する
   */
  findRelatedNotes(
    articleTitle: string,
    category: string,
    summary: string,
    noteIndex: NoteIndexItem[],
    limit = 4
  ): NoteIndexItem[] {
    const textToMatch = `${articleTitle} ${category} ${summary}`.toLowerCase();
    
    // 単語単位でのマッチング用トークン
    const tokens = new Set(
      textToMatch
        .replace(/[^\w\s\u3040-\u30FF\u4E00-\u9FAF]/g, ' ')
        .split(/\s+/)
        .filter(t => t.length >= 2)
    );

    const scored = noteIndex
      .filter(item => {
        // 自分自身のNews記事などの重複判定を防止
        const isNewsDir = item.relativePath.startsWith('News\\') || item.relativePath.startsWith('News/');
        return !isNewsDir || !articleTitle.includes(item.title);
      })
      .map(item => {
        let score = 0;
        const itemTitleLower = item.title.toLowerCase();

        // 1. タイトル完全/部分一致
        if (textToMatch.includes(itemTitleLower)) {
          score += 10;
        } else {
          // タイトルに含まれる単語のマッチ
          const itemTitleTokens = itemTitleLower.split(/[\s_\-–—/]+/);
          for (const t of itemTitleTokens) {
            if (t.length >= 2 && tokens.has(t)) {
              score += 3;
            }
          }
        }

        // 2. キーワード・タグ一致
        for (const kw of item.keywords) {
          if (tokens.has(kw.toLowerCase())) {
            score += 2;
          }
        }
        for (const tag of item.tags) {
          if (tokens.has(tag.toLowerCase())) {
            score += 2;
          }
        }

        return { item, score };
      })
      .filter(r => r.score >= 3) // スコア閾値
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);

    return scored.map(s => s.item);
  }

  /**
   * AIを用いて記事の要約と要点、タグを生成する
   */
  async summarizeArticle(article: Article): Promise<ArticleSummaryResult> {
    const title = article.title;
    const desc = article.desc || '';
    const category = article.category || 'News';

    if (this.archivistAgent) {
      try {
        const res = await this.archivistAgent.summarizeAndArchive(`タイトル: ${title}\n内容: ${desc}\nカテゴリ: ${category}`);
        return {
          summary: res.summary,
          keyTakeaways: res.key_takeaways || [],
          tags: res.tags || [category]
        };
      } catch (err) {
        console.warn('[ObsidianVaultService] ArchivistAgent summarize failed, fallback:', err);
      }
    }

    if (this.geminiService) {
      try {
        const prompt = `以下のニュース記事を要約し、日本語のJSON形式で出力してください。\nタイトル: ${title}\n詳細: ${desc}\nカテゴリ: ${category}`;
        const schema: ResponseSchema = {
          type: SchemaType.OBJECT,
          properties: {
            summary: { type: SchemaType.STRING },
            keyTakeaways: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
            tags: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } }
          },
          required: ["summary", "keyTakeaways", "tags"]
        };
        const result = await this.geminiService.generateStructured<ArticleSummaryResult>(prompt, schema);
        if (result && result.summary) {
          return result;
        }
      } catch (err) {
        console.warn('[ObsidianVaultService] GeminiService summarize failed, fallback:', err);
      }
    }

    // フォールバック（AIなし）
    return {
      summary: desc ? (desc.length > 200 ? desc.slice(0, 200) + '...' : desc) : title,
      keyTakeaways: [title],
      tags: [category.replace(/\s+/g, '_')]
    };
  }

  /**
   * 単一の記事をObsidianノートとして保存する
   */
  async exportArticle(article: Article, noteIndex?: NoteIndexItem[]): Promise<string | null> {
    if (!article.link || this.processedLinks.has(article.link)) {
      return null;
    }

    const category = article.category || 'Uncategorized';
    const sanitizedCategory = category.replace(/[\\/:*?"<>|]/g, '_').trim();
    const targetDir = path.join(this.vaultPath, 'News', sanitizedCategory);

    // News/Category ディレクトリの確保
    await fs.mkdir(targetDir, { recursive: true });

    // AI要約の生成
    const summaryData = await this.summarizeArticle(article);

    // ノートインデックスが未提供の場合はインデックスを作成
    const index = noteIndex || (await this.indexVaultNotes());
    const relatedNotes = this.findRelatedNotes(article.title, category, summaryData.summary, index);

    // 日付フォーマット YYYYMMDD
    const pubDate = article.date ? new Date(article.date) : new Date();
    const datePrefix = !isNaN(pubDate.getTime())
      ? pubDate.toISOString().slice(0, 10).replace(/-/g, '')
      : new Date().toISOString().slice(0, 10).replace(/-/g, '');

    const sanitizedTitle = article.title
      .replace(/[\\/:*?"<>|]/g, '_')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 60);

    const fileName = `${datePrefix}_${sanitizedTitle}.md`;
    const filePath = path.join(targetDir, fileName);

    // Frontmatter & コンテンツ生成
    const tagsYaml = ['news', sanitizedCategory.toLowerCase().replace(/\s+/g, '_'), ...summaryData.tags]
      .map(t => t.replace(/^[#\s]+/, ''))
      .filter((v, i, a) => a.indexOf(v) === i)
      .map(t => `  - ${t}`)
      .join('\n');

    const relatedLinksSection = relatedNotes.length > 0
      ? relatedNotes.map(n => `- [[${n.title}]]`).join('\n')
      : '- 関連ノートが見つかりませんでした';

    const keyTakeawaysSection = summaryData.keyTakeaways.length > 0
      ? summaryData.keyTakeaways.map(k => `- ${k}`).join('\n')
      : `- ${article.title}`;

    const markdownContent = `---
title: "${article.title.replace(/"/g, '\\"')}"
source: "${article.link}"
category: "${category}"
date: "${pubDate.toISOString()}"
brand: "${article.brand || ''}"
tags:
${tagsYaml}
---

# ${article.title}

## 概要
${summaryData.summary}

## 主要ポイント
${keyTakeawaysSection}

## 関連ノート
${relatedLinksSection}

## 情報源
- [元記事リンク](${article.link})
`;

    try {
      await fs.writeFile(filePath, markdownContent, 'utf-8');
      this.processedLinks.add(article.link);
      console.log(`[ObsidianVaultService] Saved note: ${filePath}`);
      return filePath;
    } catch (err) {
      console.error(`[ObsidianVaultService] Failed to write file ${filePath}:`, err);
      return null;
    }
  }

  /**
   * 複数の記事を一括処理・Obsidianへ保存する
   */
  async exportArticles(articles: Article[], maxCount = 10): Promise<string[]> {
    if (!articles || articles.length === 0) return [];

    try {
      // 既存ノートのインデックスを作成
      const noteIndex = await this.indexVaultNotes();
      const savedPaths: string[] = [];

      // スコアの高い上位記事または最新記事を中心に最大 maxCount 件処理
      const targetArticles = articles.slice(0, maxCount);

      for (const article of targetArticles) {
        const result = await this.exportArticle(article, noteIndex);
        if (result) {
          savedPaths.push(result);
        }
      }

      console.log(`[ObsidianVaultService] Exported ${savedPaths.length} articles to Obsidian Vault.`);
      return savedPaths;
    } catch (err) {
      console.error('[ObsidianVaultService] Export articles failed:', err);
      return [];
    }
  }
}
