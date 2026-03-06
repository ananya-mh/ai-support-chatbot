/**
 * test-agent.js
 *
 * Quick test to verify the full agent loop works:
 * User question → MCP client → Gemini with tools → MCP tool call → response
 *
 * Run from backend/: node src/services/test-agent.js
 */

import dotenv from 'dotenv';
dotenv.config();

import { runAgent } from './src/services/agentService.js';

const testQueries = [
  'How do I add a document to Firestore in JavaScript?',
  'I\'m getting auth/user-not-found error, what should I do?',
  'Can you check if Firebase is having any outages right now?',
];

async function runTests() {
  for (const query of testQueries) {
    console.log(`\n${'═'.repeat(70)}`);
    console.log(`Developer: "${query}"`);
    console.log('═'.repeat(70));

    try {
      const response = await runAgent(query);
      console.log(`\nAgent:\n${response}`);
    } catch (err) {
      console.error(`\nError: ${err.message}`);
      console.error(err.stack);
    }

    // Delay between tests
    await new Promise((r) => setTimeout(r, 3000));
  }

  console.log('\n\nTests complete.');
  process.exit(0);
}

runTests().catch(console.error);