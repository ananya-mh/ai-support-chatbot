import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const RAW_DIR = path.join(__dirname, 'data', 'raw');
const CHUNKS_DIR = path.join(__dirname, 'data', 'chunks');
const OUTPUT_FILE = path.join(CHUNKS_DIR, 'chunks.json');

const MAX_CHUNK_CHARS = 2000;
const MIN_CHUNK_CHARS = 200;
const OVERLAP_CHARS = 200;

function parseFrontmatter(content) {
  const match = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!match) return { metadata: {}, body: content };

  const metaLines = match[1].split('\n');
  const metadata = {};
  for (const line of metaLines) {
    const [key, ...valueParts] = line.split(': ');
    if (key && valueParts.length) {
      metadata[key.trim()] = valueParts.join(': ').trim();
    }
  }
  return { metadata, body: match[2] };
}

function splitBySections(text) {
  const sections = [];
  const lines = text.split('\n');
  let currentSection = { title: 'Introduction', content: '' };

  for (const line of lines) {
    const headingMatch = line.match(/^(#{1,4})\s+(.+)$/);
    if (headingMatch) {
      if (currentSection.content.trim().length > 0) {
        sections.push({ ...currentSection, content: currentSection.content.trim() });
      }
      currentSection = {
        title: headingMatch[2].trim(),
        level: headingMatch[1].length,
        content: ''
      };
    } else {
      currentSection.content += line + '\n';
    }
  }

  if (currentSection.content.trim().length > 0) {
    sections.push({ ...currentSection, content: currentSection.content.trim() });
  }

  return sections;
}

function splitPreservingCode(text) {
  const blocks = [];
  const parts = text.split(/(```[\s\S]*?```)/g);

  for (const part of parts) {
    if (part.startsWith('```')) {
      blocks.push(part);
    } else {
      const paragraphs = part.split(/\n\n+/).filter(p => p.trim().length > 0);
      blocks.push(...paragraphs);
    }
  }

  return blocks;
}

function splitSectionIntoChunks(section, metadata) {
  const { title, content } = section;
  const chunks = [];

  if (content.length <= MAX_CHUNK_CHARS) {
    if (content.length >= MIN_CHUNK_CHARS) {
      chunks.push({
        text: `${title}\n\n${content}`,
        metadata: { ...metadata, section: title }
      });
    }
    return chunks;
  }

  const blocks = splitPreservingCode(content);
  let currentChunk = title + '\n\n';

  for (const block of blocks) {
    if ((currentChunk.length + block.length) > MAX_CHUNK_CHARS && currentChunk.length > MIN_CHUNK_CHARS) {
      chunks.push({
        text: currentChunk.trim(),
        metadata: { ...metadata, section: title }
      });

      const overlap = currentChunk.slice(-OVERLAP_CHARS);
      currentChunk = `${title} (continued)\n\n${overlap}\n${block}\n`;
    } else {
      currentChunk += block + '\n';
    }
  }

  if (currentChunk.trim().length >= MIN_CHUNK_CHARS) {
    chunks.push({
      text: currentChunk.trim(),
      metadata: { ...metadata, section: title }
    });
  }

  return chunks;
}

function chunkAllDocs() {
  if (!fs.existsSync(CHUNKS_DIR)) {
    fs.mkdirSync(CHUNKS_DIR, { recursive: true });
  }

  const files = fs.readdirSync(RAW_DIR).filter(f => f.endsWith('.md'));

  if (files.length === 0) {
    console.log('No files found in data/raw/. Run scraper.js first.');
    return;
  }

  console.log(`Chunking ${files.length} documents...\n`);

  let allChunks = [];
  let chunkId = 0;

  for (const file of files) {
    const content = fs.readFileSync(path.join(RAW_DIR, file), 'utf-8');
    const { metadata, body } = parseFrontmatter(content);
    const sections = splitBySections(body);
    let fileChunks = 0;

    for (const section of sections) {
      const chunks = splitSectionIntoChunks(section, metadata);

      for (const chunk of chunks) {
        allChunks.push({
          id: `chunk_${chunkId++}`,
          text: chunk.text,
          metadata: {
            ...chunk.metadata,
            source_file: file,
            char_count: chunk.text.length,
          }
        });
        fileChunks++;
      }
    }

    console.log(`  ${file}: ${sections.length} sections → ${fileChunks} chunks`);
  }

  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(allChunks, null, 2), 'utf-8');

  const totalChars = allChunks.reduce((sum, c) => sum + c.text.length, 0);
  const avgChars = Math.round(totalChars / allChunks.length);

  console.log(`\n────────────────────────────────────`);
  console.log(`Total chunks: ${allChunks.length}`);
  console.log(`Avg chunk size: ${avgChars} chars (~${Math.round(avgChars / 4)} tokens)`);
  console.log(`Output: ${OUTPUT_FILE}`);
  console.log(`────────────────────────────────────`);

  return allChunks;
}

export { chunkAllDocs, splitBySections, splitSectionIntoChunks };