import { Pinecone } from '@pinecone-database/pinecone';
import { GoogleGenAI } from '@google/genai';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '..', '..', '.env') });

const CHUNKS_FILE = path.join(__dirname, 'data', 'chunks', 'chunks.json');
const BATCH_SIZE = 5; // Small batches to stay within Gemini free tier rate limits
const EMBED_MODEL = 'gemini-embedding-001';
const EMBED_DIMENSIONS = 768; // Use 768 to save space; Pinecone index must match

function initPinecone() {
  const apiKey = process.env.PINECONE_API_KEY;
  if (!apiKey) {
    throw new Error('PINECONE_API_KEY not set in .env');
  }
  return new Pinecone({ apiKey });
}

function initGemini() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY not set in .env');
  }
  return new GoogleGenAI({ apiKey });
}

async function embedTexts(ai, texts) {
  // Gemini embedContent supports batch input as an array of strings
  const response = await ai.models.embedContent({
    model: EMBED_MODEL,
    contents: texts,
    config: {
      outputDimensionality: EMBED_DIMENSIONS,
    },
  });

  // Response shape: { embeddings: [{ values: [number] }] }
  return response.embeddings.map(e => e.values);
}

async function upsertBatch(index, chunks, embeddings) {
  const vectors = chunks.map((chunk, i) => ({
    id: chunk.id,
    values: embeddings[i],
    metadata: {
      text: chunk.text.substring(0, 36000),
      product: chunk.metadata.product || '',
      topic: chunk.metadata.topic || '',
      section: chunk.metadata.section || '',
      source: chunk.metadata.source || '',
      source_file: chunk.metadata.source_file || '',
    }
  }));

  // Filter out any vectors where embedding failed (undefined values)
  const validVectors = vectors.filter(v => v.values && v.values.length > 0);

  if (validVectors.length === 0) {
    throw new Error('No valid embeddings in this batch');
  }

  // SDK v7 uses { records: [...] } format
  await index.upsert({ records: validVectors });
  return validVectors.length;
}

const PROGRESS_FILE = path.join(__dirname, 'data', 'upsert-progress.json');

// ─── Progress tracking for resume ────────────────────────────────────────────

function loadProgress() {
  if (fs.existsSync(PROGRESS_FILE)) {
    return new Set(JSON.parse(fs.readFileSync(PROGRESS_FILE, 'utf-8')));
  }
  return new Set();
}

function saveProgress(doneIds) {
  fs.writeFileSync(PROGRESS_FILE, JSON.stringify([...doneIds]), 'utf-8');
}

async function upsertAllChunks() {
  if (!fs.existsSync(CHUNKS_FILE)) {
    console.log('No chunks found. Run chunker.js first.');
    return;
  }

  const allChunks = JSON.parse(fs.readFileSync(CHUNKS_FILE, 'utf-8'));
  const doneIds = loadProgress();

  // Filter out already-upserted chunks
  const chunks = allChunks.filter(c => !doneIds.has(c.id));

  console.log(`Loaded ${allChunks.length} total chunks`);
  console.log(`Already upserted: ${doneIds.size}`);
  console.log(`Remaining: ${chunks.length}\n`);

  if (chunks.length === 0) {
    console.log('All chunks already upserted! Nothing to do.');
    return;
  }

  const pc = initPinecone();
  const ai = initGemini();
  const indexName = process.env.PINECONE_INDEX || 'firebase-docs';
  const index = pc.index(indexName);

  console.log(`Upserting to Pinecone index: ${indexName}`);
  console.log(`Embedding model: ${EMBED_MODEL} (${EMBED_DIMENSIONS}d)`);
  console.log(`Batch size: ${BATCH_SIZE}\n`);

  let totalUpserted = 0;

  for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
    const batch = chunks.slice(i, i + BATCH_SIZE);
    const batchNum = Math.floor(i / BATCH_SIZE) + 1;
    const totalBatches = Math.ceil(chunks.length / BATCH_SIZE);

    console.log(`  Batch ${batchNum}/${totalBatches} (${batch.length} chunks)...`);

    try {
      const texts = batch.map(c => c.text);
      const embeddings = await embedTexts(ai, texts);

      const count = await upsertBatch(index, batch, embeddings);
      totalUpserted += count;

      // Mark these chunks as done
      batch.forEach(c => doneIds.add(c.id));
      saveProgress(doneIds);

      console.log(`    ✓ Embedded and upserted ${count} vectors (${doneIds.size}/${allChunks.length} total)`);

      // Gemini free tier: be conservative to avoid 429s
      if (i + BATCH_SIZE < chunks.length) {
        await new Promise(r => setTimeout(r, 5000));
      }

    } catch (err) {
      console.log(`    ✗ Batch failed: ${err.message}`);

      if (err.message.includes('429') || err.message.includes('RESOURCE_EXHAUSTED')) {
        // Check if it's a daily limit (contains "per day" or "1000")
        if (err.message.includes('1000') || err.message.includes('PerDay')) {
          console.log(`\n    🛑 Daily quota exhausted. Progress saved at ${doneIds.size}/${allChunks.length} chunks.`);
          console.log(`    Run again tomorrow to continue.\n`);
          break;
        }
        console.log(`    ⏳ Rate limited. Waiting 60s...`);
        await new Promise(r => setTimeout(r, 60000));
        i -= BATCH_SIZE; // retry
      }
    }
  }

  console.log(`\n────────────────────────────────────`);
  console.log(`Done! ${totalUpserted}/${chunks.length} chunks upserted to "${indexName}"`);
  console.log(`────────────────────────────────────`);
}

export { upsertAllChunks, embedTexts };