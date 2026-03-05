/**
 * test-search.js
 *
 * Quick test to verify the search_docs tool works.
 * Run from backend/: node src/services/test-search.js
 */

import dotenv from 'dotenv';
dotenv.config();

import { searchDocs, formatDocsForPrompt } from './embeddingService.js';

const testQueries = [
  'how do I add data to Firestore?',
  'firebase auth error user not found',
  'how to write security rules for Firestore',
];

async function runTests() {
  for (const query of testQueries) {
    console.log(`\n${'═'.repeat(60)}`);
    console.log(`Query: "${query}"`);
    console.log('═'.repeat(60));

    try {
      const results = await searchDocs(query, { topK: 3 });

      console.log(`\nFound ${results.length} results:\n`);
      results.forEach((r, i) => {
        console.log(`  ${i + 1}. [score: ${r.score.toFixed(4)}] ${r.product}/${r.topic} — ${r.section}`);
        console.log(`     ${r.text.substring(0, 150)}...`);
        console.log('');
      });

      // Also test the prompt formatting
      const promptContext = formatDocsForPrompt(results);
      console.log(`Formatted prompt context length: ${promptContext.length} chars`);

    } catch (err) {
      console.log(`  Error: ${err.message}`);
    }

    // Small delay between queries
    await new Promise(r => setTimeout(r, 2000));
  }
}

runTests().catch(console.error);