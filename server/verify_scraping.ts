import { EnrichmentService } from './src/services/EnrichmentService.js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function verify() {
    console.log('--- Enrichment Service Real Verification ---');
    const service = new EnrichmentService();
    await service.init();

    const testUrls = [
        {
            name: 'Zenn (OGP)',
            url: 'https://zenn.dev/zenn/articles/zenn-cli-guide',
            category: 'AI・ソフトウェア'
        },
        {
            name: 'GitHub (OGP)',
            url: 'https://github.com/google/generative-ai-js',
            category: 'AI・ソフトウェア'
        }
    ];

    for (const test of testUrls) {
        console.log(`Testing ${test.name}: ${test.url}...`);
        const start = Date.now();
        const article = {
            link: test.url,
            category: test.category,
            title: 'Test',
            img: null
        };
        
        // 1st time (Scraping)
        const result1 = await service.enrich(article as any);
        const duration1 = Date.now() - start;
        console.log(`  1st attempt: ${result1.img ? 'SUCCESS' : 'FAILED'} (${duration1}ms)`);
        console.log(`  Extracted URL: ${result1.img}`);

        // 2nd time (Cache)
        const start2 = Date.now();
        const result2 = await service.enrich({ ...article, img: null } as any);
        const duration2 = Date.now() - start2;
        console.log(`  2nd attempt: ${result2.img ? 'SUCCESS' : 'FAILED'} (${duration2}ms)`);
        
        if (result1.img === result2.img && duration2 < duration1) {
            console.log('  Cache: WORKING');
        } else {
            console.log('  Cache: FAILED or inconclusive');
        }
    }

    // Verify cache file existence
    const cachePath = path.resolve(__dirname, 'data/image_cache.json');
    try {
        const stats = await fs.stat(cachePath);
        console.log(`Cache file exists: ${cachePath} (${stats.size} bytes)`);
        const content = await fs.readFile(cachePath, 'utf-8');
        const cache = JSON.parse(content);
        console.log(`Cache entries: ${Object.keys(cache).length}`);
    } catch (e) {
        console.error('Cache file not found!');
    }
}

verify().catch(console.error);
