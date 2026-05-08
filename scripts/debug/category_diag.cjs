const { ScraperFacade } = require('../../src/ScraperFacade');
const path = require('path');
const fs = require('fs');

async function diagnostic() {
    console.log("=== Aegis Nexus Diagnostic: Category Breakdown ===");
    const dataDir = path.join(__dirname, '../../data');
    const interestsPath = path.join(dataDir, 'interests.json');
    const feedsPath = path.join(dataDir, 'feed_config.json');

    if (!fs.existsSync(interestsPath) || !fs.existsSync(feedsPath)) {
        console.error("Data files not found.");
        return;
    }

    const interests = JSON.parse(fs.readFileSync(interestsPath, 'utf8'));
    const scraper = new ScraperFacade(interestsPath, feedsPath, dataDir);

    console.log(`Starting fetch for ${Object.keys(interests.categories).length} categories...`);
    try {
        const articles = await scraper.fetchAndProcessArticlesWithFallback(interests);
        console.log(`\nTotal Articles Fetched: ${articles.length}`);

        const breakdown = {};
        for (const catName of Object.keys(interests.categories)) {
            breakdown[catName] = 0;
        }

        articles.forEach(a => {
            if (breakdown[a.category] !== undefined) {
                breakdown[a.category]++;
            } else {
                breakdown[`UNKNOWN (${a.category})`] = (breakdown[`UNKNOWN (${a.category})`] || 0) + 1;
            }
        });

        console.log("\n--- Breakdown by Category ---");
        Object.entries(breakdown).forEach(([cat, count]) => {
            const status = count > 0 ? "OK" : "!!! ZERO !!!";
            console.log(`${status.padEnd(12)} | ${cat.padEnd(45)} : ${count} items`);
        });

        const targetCategories = [
            "スマートリビング & ウェルネス",
            "クリエイティブイメージング & バーチャルプロダクション",
            "Eコマース & リテールDX",
            "先端マテリアル & 半導体技術"
        ];

        console.log("\n--- Target Category Deep Dive ---");
        targetCategories.forEach(cat => {
            const count = breakdown[cat] || 0;
            console.log(`Category: ${cat}`);
            console.log(`  Count: ${count}`);
            if (count === 0) {
                const feeds = scraper.feedManager.getActiveFeeds(cat);
                console.log(`  Active Feeds (${feeds.length}):`);
                feeds.forEach(f => console.log(`    - ${f}`));
            }
        });

    } catch (err) {
        console.error("Diagnostic failed:", err);
    }
}

diagnostic();
