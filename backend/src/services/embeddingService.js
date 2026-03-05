/**
 * embeddingService.js
 *
 * The `search_docs` tool for the agent.
 * Takes a developer's natural language query, embeds it using Gemini,
 * queries Pinecone for the most semantically similar doc chunks,
 * and returns them with metadata.
 *
 * Usage:
 *   import { searchDocs } from './embeddingService.js';
 *   const results = await searchDocs('how do I add data to Firestore?');
 */

import { GoogleGenAI } from '@google/genai';
import { Pinecone } from '@pinecone-database/pinecone';

// ─── Singleton clients (initialized once, reused across calls) ───────────────

let ai = null;
let pineconeIndex = null;

const EMBED_MODEL = 'gemini-embedding-001';
const EMBED_DIMENSIONS = 768; // Must match what was used during ingestion
const DEFAULT_TOP_K = 5;

function getAI() {
  if (!ai) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error('GEMINI_API_KEY not set in .env');
    ai = new GoogleGenAI({ apiKey });
  }
  return ai;
}

function getPineconeIndex() {
  if (!pineconeIndex) {
    const apiKey = process.env.PINECONE_API_KEY;
    if (!apiKey) throw new Error('PINECONE_API_KEY not set in .env');
    const pc = new Pinecone({ apiKey });
    const indexName = process.env.PINECONE_INDEX || 'firebase-docs';
    pineconeIndex = pc.index(indexName);
  }
  return pineconeIndex;
}

// ─── Embed a query ───────────────────────────────────────────────────────────

async function embedQuery(text) {
  const client = getAI();
  const response = await client.models.embedContent({
    model: EMBED_MODEL,
    contents: [text],
    config: {
      outputDimensionality: EMBED_DIMENSIONS,
    },
  });
  return response.embeddings[0].values;
}

// ─── Search Pinecone ─────────────────────────────────────────────────────────

/**
 * Search Firebase docs for chunks relevant to the query.
 *
 * @param {string} query - The developer's question
 * @param {object} options
 * @param {number} options.topK - Number of results to return (default 5)
 * @param {string} options.product - Filter by Firebase product (e.g. 'firestore', 'auth')
 * @returns {Array<{ text: string, score: number, metadata: object }>}
 */
async function searchDocs(query, options = {}) {
  const { topK = DEFAULT_TOP_K, product = null } = options;

  // 1. Embed the query
  const queryVector = await embedQuery(query);

  // 2. Build Pinecone query
  const queryParams = {
    vector: queryVector,
    topK,
    includeMetadata: true,
  };

  // Optional: filter by Firebase product
  if (product) {
    queryParams.filter = { product: { $eq: product } };
  }

  // 3. Query Pinecone
  const index = getPineconeIndex();
  const response = await index.query(queryParams);

  // 4. Format results
  const results = (response.matches || []).map((match) => ({
    id: match.id,
    score: match.score,
    text: match.metadata?.text || '',
    product: match.metadata?.product || '',
    topic: match.metadata?.topic || '',
    section: match.metadata?.section || '',
    source: match.metadata?.source || '',
  }));

  return results;
}

// ─── Format results for LLM context injection ───────────────────────────────

/**
 * Takes search results and formats them into a string
 * suitable for injecting into the LLM prompt as context.
 */
function formatDocsForPrompt(results) {
  if (!results || results.length === 0) {
    return 'No relevant documentation found.';
  }

  return results
    .map((r, i) => {
      const header = `[Doc ${i + 1}] (${r.product}/${r.topic} - ${r.section})`;
      const source = r.source ? `Source: ${r.source}` : '';
      return `${header}\n${r.text}\n${source}`;
    })
    .join('\n\n---\n\n');
}

export { searchDocs, embedQuery, formatDocsForPrompt };