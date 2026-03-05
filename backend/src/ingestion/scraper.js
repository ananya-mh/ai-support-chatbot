import https from 'https';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const FIREBASE_DOC_URLS = [
  { url: 'https://firebase.google.com/docs/auth/web/start', product: 'auth', topic: 'getting-started-web' },
  { url: 'https://firebase.google.com/docs/auth/web/password-auth', product: 'auth', topic: 'password-auth-web' },
  { url: 'https://firebase.google.com/docs/auth/web/google-signin', product: 'auth', topic: 'google-signin-web' },
  { url: 'https://firebase.google.com/docs/auth/web/manage-users', product: 'auth', topic: 'manage-users-web' },
  { url: 'https://firebase.google.com/docs/auth/admin/errors', product: 'auth', topic: 'admin-errors' },
  { url: 'https://firebase.google.com/docs/firestore/quickstart', product: 'firestore', topic: 'quickstart' },
  { url: 'https://firebase.google.com/docs/firestore/manage-data/add-data', product: 'firestore', topic: 'add-data' },
  { url: 'https://firebase.google.com/docs/firestore/query-data/get-data', product: 'firestore', topic: 'get-data' },
  { url: 'https://firebase.google.com/docs/firestore/query-data/queries', product: 'firestore', topic: 'queries' },
  { url: 'https://firebase.google.com/docs/firestore/query-data/order-limit-data', product: 'firestore', topic: 'order-limit' },
  { url: 'https://firebase.google.com/docs/firestore/manage-data/transactions', product: 'firestore', topic: 'transactions' },
  { url: 'https://firebase.google.com/docs/firestore/security/get-started', product: 'firestore', topic: 'security-rules-start' },
  { url: 'https://firebase.google.com/docs/firestore/security/rules-structure', product: 'firestore', topic: 'security-rules-structure' },
  { url: 'https://firebase.google.com/docs/firestore/security/rules-conditions', product: 'firestore', topic: 'security-rules-conditions' },
  { url: 'https://firebase.google.com/docs/database/web/start', product: 'rtdb', topic: 'getting-started-web' },
  { url: 'https://firebase.google.com/docs/database/web/read-and-write', product: 'rtdb', topic: 'read-write-web' },
  { url: 'https://firebase.google.com/docs/database/web/lists-of-data', product: 'rtdb', topic: 'lists-web' },
  { url: 'https://firebase.google.com/docs/database/security', product: 'rtdb', topic: 'security-rules' },
  { url: 'https://firebase.google.com/docs/functions/get-started', product: 'functions', topic: 'getting-started' },
  { url: 'https://firebase.google.com/docs/functions/http-events', product: 'functions', topic: 'http-events' },
  { url: 'https://firebase.google.com/docs/functions/firestore-events', product: 'functions', topic: 'firestore-triggers' },
  { url: 'https://firebase.google.com/docs/functions/auth-events', product: 'functions', topic: 'auth-triggers' },
  { url: 'https://firebase.google.com/docs/functions/config-env', product: 'functions', topic: 'config-env' },
  { url: 'https://firebase.google.com/docs/hosting/quickstart', product: 'hosting', topic: 'quickstart' },
  { url: 'https://firebase.google.com/docs/hosting/full-config', product: 'hosting', topic: 'full-config' },
  { url: 'https://firebase.google.com/docs/storage/web/start', product: 'storage', topic: 'getting-started-web' },
  { url: 'https://firebase.google.com/docs/storage/web/upload-files', product: 'storage', topic: 'upload-files-web' },
  { url: 'https://firebase.google.com/docs/storage/web/download-files', product: 'storage', topic: 'download-files-web' },
  { url: 'https://firebase.google.com/docs/storage/security', product: 'storage', topic: 'security-rules' },
  { url: 'https://firebase.google.com/docs/cloud-messaging/js/client', product: 'fcm', topic: 'web-client' },
  { url: 'https://firebase.google.com/docs/cloud-messaging/js/receive', product: 'fcm', topic: 'web-receive' },
  { url: 'https://firebase.google.com/docs/projects/learn-more', product: 'general', topic: 'project-overview' },
  { url: 'https://firebase.google.com/docs/web/setup', product: 'general', topic: 'web-setup' },
  { url: 'https://firebase.google.com/docs/cli', product: 'general', topic: 'cli' },
];

function fetchPage(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0 (compatible; FirebaseSupportBot/1.0)' } }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return fetchPage(res.headers.location).then(resolve).catch(reject);
      }
      if (res.statusCode !== 200) {
        return reject(new Error(`HTTP ${res.statusCode} for ${url}`));
      }
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
      res.on('error', reject);
    }).on('error', reject);
  });
}

function htmlToText(html) {
  let content = html;

  const articleMatch = html.match(/<article[^>]*>([\s\S]*?)<\/article>/i);
  const devsiteMatch = html.match(/<devsite-content[^>]*>([\s\S]*?)<\/devsite-content>/i);
  const mainMatch = html.match(/<main[^>]*>([\s\S]*?)<\/main>/i);

  if (articleMatch) content = articleMatch[1];
  else if (devsiteMatch) content = devsiteMatch[1];
  else if (mainMatch) content = mainMatch[1];

  const codeBlocks = [];
  content = content.replace(/<pre[^>]*><code[^>]*>([\s\S]*?)<\/code><\/pre>/gi, (match, code) => {
    const decoded = code
      .replace(/&lt;/g, '<').replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&').replace(/&quot;/g, '"')
      .replace(/<[^>]+>/g, '');
    codeBlocks.push(decoded.trim());
    return `\n\`\`\`\nCODE_BLOCK_${codeBlocks.length - 1}\n\`\`\`\n`;
  });

  content = content.replace(/<code[^>]*>([\s\S]*?)<\/code>/gi, (match, code) => {
    const decoded = code.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&').replace(/<[^>]+>/g, '');
    return `\`${decoded}\``;
  });

  content = content.replace(/<h1[^>]*>([\s\S]*?)<\/h1>/gi, '\n# $1\n');
  content = content.replace(/<h2[^>]*>([\s\S]*?)<\/h2>/gi, '\n## $1\n');
  content = content.replace(/<h3[^>]*>([\s\S]*?)<\/h3>/gi, '\n### $1\n');
  content = content.replace(/<h4[^>]*>([\s\S]*?)<\/h4>/gi, '\n#### $1\n');
  content = content.replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, '\n- $1');
  content = content.replace(/<\/p>/gi, '\n\n');
  content = content.replace(/<br\s*\/?>/gi, '\n');
  content = content.replace(/<[^>]+>/g, '');

  content = content.replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&').replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'").replace(/&nbsp;/g, ' ');

  codeBlocks.forEach((block, i) => {
    content = content.replace(`CODE_BLOCK_${i}`, block);
  });

  content = content.replace(/\n{3,}/g, '\n\n');
  content = content.replace(/[ \t]+/g, ' ');

  return content.trim();
}

async function scrapeFirebaseDocs() {
  const outputDir = path.join(__dirname, 'data', 'raw');

  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  console.log(`Scraping ${FIREBASE_DOC_URLS.length} Firebase doc pages...\n`);

  let success = 0;
  let failed = 0;

  for (const doc of FIREBASE_DOC_URLS) {
    const filename = `${doc.product}_${doc.topic}.md`;
    const filepath = path.join(outputDir, filename);

    try {
      console.log(`  Fetching: ${doc.product}/${doc.topic}...`);
      const html = await fetchPage(doc.url);
      const text = htmlToText(html);

      if (text.length < 100) {
        console.log(`    ⚠ Very short content (${text.length} chars), might be blocked or empty`);
      }

      const output = [
        `---`,
        `source: ${doc.url}`,
        `product: ${doc.product}`,
        `topic: ${doc.topic}`,
        `scraped_at: ${new Date().toISOString()}`,
        `---`,
        '',
        text
      ].join('\n');

      fs.writeFileSync(filepath, output, 'utf-8');
      console.log(`    ✓ Saved: ${filename} (${text.length} chars)`);
      success++;

      await new Promise(r => setTimeout(r, 1000));

    } catch (err) {
      console.log(`    ✗ Failed: ${err.message}`);
      failed++;
    }
  }

  console.log(`\nDone! ${success} succeeded, ${failed} failed.`);
  console.log(`Raw docs saved to: ${outputDir}`);
}

export { scrapeFirebaseDocs, FIREBASE_DOC_URLS };