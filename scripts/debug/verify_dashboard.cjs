const { ScraperFacade } = require('../../src/ScraperFacade');
const path = require('path');
const fs = require('fs');

async function testDashboard() {
    console.log("=== Aegis Nexus: Full Dashboard Verification ===");
    const dataDir = path.join(__dirname, '../../data');
    const interestsPath = path.join(dataDir, 'interests.json');
    const feedsPath = path.join(dataDir, 'feed_config.json');

    const interests = JSON.parse(fs.readFileSync(interestsPath, 'utf8'));
    const scraper = new ScraperFacade(interestsPath, feedsPath, dataDir);

    console.log("Generating dashboard data...");
    try {
        const dashboard = await scraper.getDashboard(interests);
        
        console.log("\n--- Dashboard Content Summary ---");
        Object.entries(dashboard).forEach(([cat, data]) => {
            const count = data.articles.length;
            const status = count > 0 ? "OK" : "!!! EMPTY !!!";
            console.log(`${status.padEnd(12)} | ${cat.padEnd(45)} : ${count} articles`);
        });

        const allOk = Object.values(dashboard).every(d => d.articles.length > 0);
        if (allOk) {
            console.log("\nSUCCESS: All categories have articles!");
        } else {
            console.warn("\nWARNING: Some categories are empty.");
        }
    } catch (err) {
        console.error("Dashboard generation failed:", err);
    }
}

testDashboard();
