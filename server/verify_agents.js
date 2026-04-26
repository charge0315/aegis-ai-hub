import { ArchitectAgent } from './src/agents/ArchitectAgent.js';
import { GeneratorAgent } from './src/agents/GeneratorAgent.js';
import { EvaluatorAgent } from './src/agents/EvaluatorAgent.js';
import { NexusOrchestrator } from './src/core/NexusOrchestrator.js';

/**
 * Mock Gemini Service for Verification
 */
class MockGeminiService {
    async chat(history, message, schema) {
        console.log(`[MockGemini] Received message: ${message.substring(0, 50)}...`);
        
        // Architect Plan Mock
        if (message.includes("設計プランを立案")) {
            return {
                rational: "Mocked plan for testing",
                architecture_changes: [
                    { file: "test.js", action: "create", description: "Create a test file" }
                ],
                verification_steps: ["Step 1", "Step 2"]
            };
        }

        // Generator implementation Mock
        if (message.includes("設計プランに基づき、最高品質のコードを生成")) {
            return {
                implementations: [
                    { file: "test.js", content: "console.log('Hello World');", explanation: "Mocked code" }
                ]
            };
        }

        // Evaluator Mock
        if (message.includes("品質基準を満たしているかを厳格に評価")) {
            return {
                score: 95,
                passed: true,
                feedback: "Mocked evaluation passed",
                security_review: "No issues found",
                improvement_suggestions: ["Keep up the good work"]
            };
        }

        return "Mock response";
    }
}

async function verify() {
    console.log("=== Agent Core Verification ===");
    const mockGemini = new MockGeminiService();
    const orchestrator = new NexusOrchestrator(mockGemini);

    // Mock SSE subscriber
    const mockRes = {
        write: (data) => {
            const parsed = JSON.parse(data.replace('data: ', '').trim());
            console.log(`[SSE Notification] Status: ${parsed.status}, Msg: ${parsed.message}`);
        },
        on: () => {}
    };
    orchestrator.subscribe(mockRes);

    console.log("\n--- Starting Autonomous Loop ---");
    await orchestrator.runAutonomousLoop("新しいテスト用コンポーネントを作成してください。");
    console.log("--- Loop Finished ---\n");
    
    console.log("Verification Successful!");
}

verify().catch(err => {
    console.error("Verification Failed:", err);
    process.exit(1);
});
