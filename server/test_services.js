import { ScoringService } from './src/services/ScoringService.js';
import { Article } from './src/models/Article.js';

/**
 * 個別のサービスロジックを検証するテストスクリプト
 */
async function runTests() {
    console.log('--- サービスロジック テスト開始 ---');

    // モックの興味データ
    const mockInterests = {
        categories: {
            "AI・ソフトウェア": {
                brands: ["OpenAI"],
                keywords: ["ChatGPT", "LLM"],
                score: 10
            },
            "ロードバイク": {
                brands: ["Shimano"],
                keywords: ["Dura-Ace"],
                score: 10
            }
        }
    };

    const scorer = new ScoringService(mockInterests);

    // 1. カテゴリ判定のテスト
    console.log('\n[1. カテゴリ判定テスト]');
    const testCases = [
        { title: "新型のギターアンプが登場", expected: "音楽・ギター・DTM" },
        { title: "OpenAIが新しいLLMを発表", expected: "AI・ソフトウェア" },
        { title: "シマノの新型コンポを試す", expected: "ロードバイク" },
        { title: "普通のガジェットニュース", original: "ガジェット", expected: "ガジェット" }
    ];

    testCases.forEach(tc => {
        const result = scorer.detectCategory(tc.title, "", tc.original || "未分類");
        const pass = result === tc.expected;
        console.log(`${pass ? '✅' : '❌'} ${tc.title} -> ${result} (期待値: ${tc.expected})`);
    });

    // 2. スコアリングのテスト
    console.log('\n[2. スコアリングテスト]');
    const scoreCases = [
        { title: "OpenAIのChatGPT", cat: "AI・ソフトウェア", expected: 5 + 10 + 8 }, // 基本5 + ブランド10 + キーワード8
        { title: "単なるニュース", cat: "AI・ソフトウェア", expected: 5 }
    ];

    scoreCases.forEach(sc => {
        const result = scorer.calculateScore(sc.title, "", sc.cat);
        const pass = result === sc.expected;
        console.log(`${pass ? '✅' : '❌'} ${sc.title} -> ${result} (期待値: ${sc.expected})`);
    });

    // 3. Articleモデルのテスト
    console.log('\n[3. Articleモデル正規化テスト]');
    const rawData = {
        title: "<b>太字タイトル</b>",
        desc: "<div>HTMLタグが含まれる説明文</div>".repeat(20), // 長い文章
        category: "AI・ソフトウェア"
    };
    const article = new Article(rawData);
    console.log(`✅ タグ除去後の説明文: ${article.desc}`);
    console.log(`✅ 長さ制限確認: ${article.desc.length}文字`);

    console.log('\n--- すべてのテストが完了しました ---');
}

runTests().catch(console.error);
