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

async function upsertAllChunks() {
  if (!fs.existsSync(CHUNKS_FILE)) {
    console.log('No chunks found. Run chunker.js first.');
    return;
  }

  const chunks = JSON.parse(fs.readFileSync(CHUNKS_FILE, 'utf-8'));
  console.log(`Loaded ${chunks.length} chunks from ${CHUNKS_FILE}\n`);

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

      // Debug: log first batch details
      if (batchNum === 1) {
        console.log(`    DEBUG: got ${embeddings.length} embeddings`);
        console.log(`    DEBUG: first embedding length: ${embeddings[0]?.length}`);
        console.log(`    DEBUG: first embedding sample: [${embeddings[0]?.slice(0, 3).join(', ')}...]`);
      }
      const count = await upsertBatch(index, batch, embeddings);
      totalUpserted += count;

      console.log(`    ✓ Embedded and upserted ${count} vectors`);

      // Gemini free tier: be conservative to avoid 429s
      if (i + BATCH_SIZE < chunks.length) {
        await new Promise(r => setTimeout(r, 5000));
      }

    } catch (err) {
      console.log(`    ✗ Batch failed: ${err.message}`);

      if (err.message.includes('429') || err.message.includes('RESOURCE_EXHAUSTED')) {
        console.log(`    ⏳ Rate limited. Waiting 30s...`);
        await new Promise(r => setTimeout(r, 30000));
        i -= BATCH_SIZE; // retry
      }
    }
  }

  console.log(`\n────────────────────────────────────`);
  console.log(`Done! ${totalUpserted}/${chunks.length} chunks upserted to "${indexName}"`);
  console.log(`────────────────────────────────────`);
}

export { upsertAllChunks, embedTexts };