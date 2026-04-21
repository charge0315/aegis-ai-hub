import fs from 'fs';
import path from 'path';
import axios from 'axios';
import * as cheerio from 'cheerio';
import Parser from 'rss-parser';

/**
 * RSSパースの設定
 */
const parser = new Parser({
    customFields: {
        item: [
            ['content:encoded', 'contentEncoded'],
            ['dc:title', 'title'],
            ['dc:description', 'description'],
            ['media:content', 'mediaContent'],
            ['media:thumbnail', 'mediaThumbnail']
        ]
    }
});

/**
 * 日本語テック・ガジェットサイトを巡回し、最新記事を抽出するコア関数
 */
export async function scrapeGadgetNews(interests, feedConfigPath) {
    const news = {};
    for (const catName in interests.categories) {
        news[catName] = [];
    }

    // フィード設定の読み込み
    let feedConfig = {};
    try {
        feedConfig = JSON.parse(fs.readFileSync(feedConfigPath, 'utf8'));
    } catch (e) {
        console.error("フィード設定の読み込みに失敗しました。");
        return news;
    }

    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);

    const allMusicKeys = ['ギター', 'エフェクター', 'アンプ', 'イヤホン', 'ヘッドホン', 'オーディオ', 'dac', 'daw', '楽器', 'technics', 'sony', 'panasonic', 'dtm', 'midi', 'シンセサイザー'];
    const allAiKeys = [' ai ', 'llm', 'gpt', 'openai', 'claude', 'npu', '機械学習', 'copilot', 'stable diffusion'];

    let configChanged = false;

    // カテゴリごとにフィードを巡回
    for (const catName in feedConfig) {
        const catData = feedConfig[catName];
        const activeFeeds = [...catData.active];

        for (const url of activeFeeds) {
            try {
                const feed = await parser.parseURL(url);
                // 成功したらエラーカウントをリセット
                if (catData.failures[url]) {
                    delete catData.failures[url];
                    configChanged = true;
                }

                for (const item of feed.items) {
                    const pubDate = new Date(item.isoDate || item.pubDate);
                    if (pubDate < oneMonthAgo) continue;

                    const title = item.title || item['dc:title'] || "";
                    const snippet = item.contentSnippet || item.description || "";
                    const text = (title + snippet).toLowerCase();
                    
                    let score = 5;
                    let detectedCat = catName;

                    // カテゴリの横断再判定
                    if (allMusicKeys.some(k => text.includes(k))) detectedCat = '音楽・ギター・DTM';
                    else if (text.includes('ロードバイク') || text.includes('自転車') || text.includes('シマノ')) detectedCat = 'ロードバイク';
                    else if (allAiKeys.some(k => text.includes(k))) detectedCat = 'AI・ソフトウェア';
                    else if (text.includes('ゲーム') || text.includes('ps5') || text.includes('任天堂') || text.includes('switch')) detectedCat = 'ゲーム';

                    const catInfo = interests.categories[detectedCat] || { brands: [], keywords: [] };
                    catInfo.brands.forEach(b => { if (text.includes(b.toLowerCase())) score += 10; });
                    catInfo.keywords.forEach(k => { if (text.includes(k.toLowerCase())) score += 8; });

                    const article = {
                        title: title,
                        link: item.link,
                        desc: snippet.slice(0, 120).replace(/<[^>]*>?/gm, '') + '...',
                        brand: extractBrand(title, interests),
                        score: score,
                        img: extractImage(item) || getPlaceholder(detectedCat),
                        date: item.isoDate || item.pubDate
                    };

                    if (news[detectedCat]) news[detectedCat].push(article);
                }
            } catch (e) {
                console.error(`スクレイピングエラー: ${url} - ${e.message}`);
                
                // エラーカウントの更新
                catData.failures[url] = (catData.failures[url] || 0) + 1;
                
                // 3回連続エラーで差し替え
                if (catData.failures[url] >= 3 && catData.pool.length > 0) {
                    const nextUrl = catData.pool.shift();
                    console.log(`フィードを差し替えます: ${url} -> ${nextUrl}`);
                    catData.active = catData.active.map(u => u === url ? nextUrl : u);
                    configChanged = true;
                }
            }
        }
    }

    // 設定が変更された場合は保存
    if (configChanged) {
        fs.writeFileSync(feedConfigPath, JSON.stringify(feedConfig, null, 2));
    }

    // データのクレンジングと整形
    for (const cat in news) {
        const seen = new Set();
        news[cat] = news[cat]
            .filter(item => {
                if (seen.has(item.link)) return false;
                seen.add(item.link);
                return true;
            })
            .sort((a, b) => new Date(b.date) - new Date(a.date))
            .slice(0, 15);
    }

    return news;
}

/**
 * 記事タイトルからブランド名を抽出する
 */
function extractBrand(title, interests) {
    const lowerTitle = title.toLowerCase();
    for (const catName in interests.categories) {
        for (const brand of interests.categories[catName].brands) {
            if (lowerTitle.includes(brand.toLowerCase())) return brand;
        }
    }
    const commonBrands = ['Google', 'AWS', 'Microsoft', 'NVIDIA', 'Apple', 'Sony', 'Technics', 'ASUS', 'MSI', 'Razer', 'Anker', 'Boss', 'Fender', 'Gibson'];
    for (const b of commonBrands) {
        if (lowerTitle.includes(b.toLowerCase())) return b;
    }
    return "News";
}

/**
 * RSSの各フィールドから記事のサムネイル画像を頑張って探す
 */
function extractImage(item) {
    // 1. media:content (RSSの標準的な画像フィールド)
    if (item.mediaContent) {
        const media = item.mediaContent;
        if (media.$ && media.$.url) return media.$.url;
        if (Array.isArray(media) && media[0] && media[0].$ && media[0].$.url) return media[0].$.url;
    }

    // 2. media:thumbnail
    if (item.mediaThumbnail && item.mediaThumbnail.$ && item.mediaThumbnail.$.url) {
        return item.mediaThumbnail.$.url;
    }

    // 3. enclosure
    if (item.enclosure && item.enclosure.url) return item.enclosure.url;

    // 4. 特殊なサイト（4Gamer等）のdescriptionパース
    const snippet = item.description || "";
    if (snippet.includes('4gamer.net')) {
        const matches = snippet.match(/src="([^"]+\.(jpg|png|gif|jpeg))"/i);
        if (matches && matches[1]) return matches[1];
    }

    // 5. Content内のimgタグをパース
    const content = item.contentEncoded || item.content || item.description || "";
    if (content) {
        const $ = cheerio.load(content);
        let foundSrc = null;
        $('img').each((i, el) => {
            const src = $(el).attr('src');
            if (src && src.startsWith('http')) {
                if (!src.includes('ads') && !src.includes('track') && !src.includes('pixel') && !src.includes('counter')) {
                    foundSrc = src;
                    return false;
                }
            }
        });
        if (foundSrc) return foundSrc;
    }
    return null;
}

/**
 * 画像が見つからなかった場合に表示する、カテゴリごとのスタイリッシュな代替画像
 */
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
