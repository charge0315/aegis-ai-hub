import axios from 'axios';
import * as cheerio from 'cheerio';
import Parser from 'rss-parser';

const parser = new Parser({
    customFields: {
        item: [
            ['content:encoded', 'contentEncoded'],
            ['dc:title', 'title'],
            ['dc:description', 'description']
        ]
    }
});

export async function scrapeGadgetNews(interests) {
    const news = {};
    for (const catName in interests.categories) {
        news[catName] = [];
    }

    const targets = [
        // AI & Software
        { url: 'https://japan.googleblog.com/atom.xml', cat: 'AI・ソフトウェア' },
        { url: 'https://zenn.dev/topics/ai/feed', cat: 'AI・ソフトウェア' },
        { url: 'https://ledge.ai/feed/', cat: 'AI・ソフトウェア' },
        
        // PC & Hardware
        { url: 'https://pc.watch.impress.co.jp/data/rss/pcw/index.rdf', cat: 'PC・ハードウェア' },
        { url: 'https://rss.itmedia.co.jp/rss/2.0/pcuser.xml', cat: 'PC・ハードウェア' },
        { url: 'https://ascii.jp/digital/rss.xml', cat: 'PC・ハードウェア' },
        
        // Games
        { url: 'https://www.4gamer.net/rss/index.xml', cat: 'ゲーム' },
        { url: 'https://www.famitsu.com/rss/all.xml', cat: 'ゲーム' },
        
        // Music & Audio
        { url: 'https://av.watch.impress.co.jp/data/rss/avw/index.rdf', cat: '音楽・ギター・DTM' },
        { url: 'https://www.sony.jp/CorporateCruise/Press/rss/index.xml', cat: '音楽・ギター・DTM' },
        { url: 'https://www.barks.jp/rss/barks.xml', cat: '音楽・ギター・DTM' },
        
        // Road Bike
        { url: 'https://cycling.p-news.jp/feed/', cat: 'ロードバイク' },
        { url: 'https://www.cyclesports.jp/feed/', cat: 'ロードバイク' },

        // Gadgets & PR
        { url: 'https://www.gizmodo.jp/index.xml', cat: 'ガジェット' },
        { url: 'https://prtimes.jp/main/html/index/category_id/12.xml', cat: 'ガジェット' }
    ];

    for (const target of targets) {
        try {
            const feed = await parser.parseURL(target.url);
            for (const item of feed.items) {
                const title = item.title || item['dc:title'] || "";
                const snippet = item.contentSnippet || item.description || "";
                const text = (title + snippet).toLowerCase();
                
                let score = 5;
                let detectedCat = target.cat;

                // カテゴリをキーワードで横断的に再判定（クロスオーバー対応）
                if (text.includes('ギター') || text.includes('エフェクター') || text.includes('dtm')) detectedCat = '音楽・ギター・DTM';
                else if (text.includes('ロードバイク') || text.includes('自転車') || text.includes('シマノ')) detectedCat = 'ロードバイク';
                else if (text.includes('ai') || text.includes('llm') || text.includes('gpt')) detectedCat = 'AI・ソフトウェア';
                else if (text.includes('ゲーム') || text.includes('ps5') || text.includes('任天堂')) detectedCat = 'ゲーム';

                // スコアリング
                const catInfo = interests.categories[detectedCat] || { brands: [], keywords: [] };
                catInfo.brands.forEach(b => { if (text.includes(b.toLowerCase())) score += 10; });
                catInfo.keywords.forEach(k => { if (text.includes(k.toLowerCase())) score += 8; });

                const article = {
                    title: title,
                    link: item.link,
                    desc: snippet.slice(0, 120).replace(/<[^>]*>?/gm, '') + '...',
                    brand: extractBrand(title, interests),
                    score: score,
                    img: extractImage(item) || getPlaceholder(detectedCat)
                };

                if (news[detectedCat]) {
                    news[detectedCat].push(article);
                } else {
                    // 新規カテゴリ（JSON追加分）への対応
                    if (!news[detectedCat]) news[detectedCat] = [];
                    news[detectedCat].push(article);
                }
            }
        } catch (e) {
            console.error(`Error: ${target.url} - ${e.message}`);
        }
    }

    // 重複除去とソート
    for (const cat in news) {
        const seen = new Set();
        news[cat] = news[cat]
            .filter(item => {
                if (seen.has(item.link)) return false;
                seen.add(item.link);
                return true;
            })
            .sort((a, b) => b.score - a.score)
            .slice(0, 15);
    }

    return news;
}

function extractBrand(title, interests) {
    const lowerTitle = title.toLowerCase();
    for (const catName in interests.categories) {
        for (const brand of interests.categories[catName].brands) {
            if (lowerTitle.includes(brand.toLowerCase())) return brand;
        }
    }
    return "News";
}

function extractImage(item) {
    if (item.enclosure && item.enclosure.url) return item.enclosure.url;
    const content = item.contentEncoded || item.content || item.description || "";
    if (content) {
        const $ = cheerio.load(content);
        const imgSrc = $('img').attr('src');
        if (imgSrc && imgSrc.startsWith('http')) return imgSrc;
    }
    return null;
}

function getPlaceholder(cat) {
    const mapping = {
        '音楽・ギター・DTM': "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=400",
        'AI・ソフトウェア': "https://images.unsplash.com/photo-1677442136019-21780ecad995?w=400",
        'PC・ハードウェア': "https://images.unsplash.com/photo-1591799264318-7e6ef8ddb7ea?w=400",
        'ロードバイク': "https://images.unsplash.com/photo-1485965120184-e220f721d03e?w=400",
        'ゲーム': "https://images.unsplash.com/photo-1542751371-adc38448a05e?w=400"
    };
    return mapping[cat] || "https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=400";
}