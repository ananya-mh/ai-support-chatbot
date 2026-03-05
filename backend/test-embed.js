import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
dotenv.config();

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const response = await ai.models.embedContent({
  model: 'gemini-embedding-001',
  contents: ['hello world'],
  config: { outputDimensionality: 768 },
});

console.log('Full response keys:', Object.keys(response));
console.log('Embeddings type:', typeof response.embeddings);
console.log('Embeddings:', JSON.stringify(response.embeddings).substring(0, 300));