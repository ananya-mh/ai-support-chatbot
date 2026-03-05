import { scrapeFirebaseDocs } from './scraper.js';
import { chunkAllDocs } from './chunker.js';
import { upsertAllChunks } from './upserter.js';

async function runPipeline(step) {
  const startTime = Date.now();

  console.log('╔══════════════════════════════════════╗');
  console.log('║   Firebase Docs Ingestion Pipeline   ║');
  console.log('╚══════════════════════════════════════╝\n');

  try {
    if (!step || step === 'scrape') {
      console.log('━━━ Step 1: Scraping Firebase docs ━━━\n');
      await scrapeFirebaseDocs();
      console.log('');
    }

    if (!step || step === 'chunk') {
      console.log('━━━ Step 2: Chunking documents ━━━\n');
      chunkAllDocs();
      console.log('');
    }

    if (!step || step === 'upsert') {
      console.log('━━━ Step 3: Embedding & upserting to Pinecone ━━━\n');
      await upsertAllChunks();
      console.log('');
    }

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`\n✅ Pipeline complete in ${elapsed}s`);

  } catch (err) {
    console.error(`\n❌ Pipeline failed: ${err.message}`);
    console.error(err.stack);
    process.exit(1);
  }
}

const step = process.argv[2];
runPipeline(step);