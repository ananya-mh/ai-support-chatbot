import https from 'https';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import * as cheerio from 'cheerio';

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
  const $ = cheerio.load(html);

  // ─── Remove noise: nav, sidebar, footer, breadcrumbs, feedback widgets ─────
  $('nav, footer, header, .devsite-nav, .devsite-sidebar').remove();
  $('[role="navigation"]').remove();
  $('.devsite-banner, .devsite-feedback, .devsite-breadcrumb').remove();
  $('style, script, noscript, svg, iframe').remove();
  $('.devsite-code-buttons-container, .copy-code-button').remove();

  // ─── Find the main content area ────────────────────────────────────────────
  let $content = $('article');
  if ($content.length === 0) $content = $('devsite-content');
  if ($content.length === 0) $content = $('main');
  if ($content.length === 0) $content = $('body');

  // ─── Handle language-tabbed code blocks ────────────────────────────────────
  // Firebase docs have tabs for different languages (Web, iOS, Android, etc.)
  // Keep only JavaScript/Web/Node.js tabs, remove the rest
  $content.find('[data-tab], [data-language], .devsite-click-to-copy').each((_, el) => {
    const $el = $(el);
    const tab = ($el.attr('data-tab') || '').toLowerCase();
    const lang = ($el.attr('data-language') || '').toLowerCase();
    const text = $el.text().toLowerCase();

    // Keep Web/JavaScript/Node.js code, remove everything else
    const keepLangs = ['javascript', 'js', 'web', 'node', 'node.js', 'typescript'];
    const removeLangs = ['swift', 'objective-c', 'java', 'kotlin', 'python', 'go', 'php', 'ruby', 'c#', 'unity', 'dart', 'flutter', 'ios', 'android'];

    const langLabel = tab || lang;
    if (removeLangs.some(l => langLabel.includes(l))) {
      $el.remove();
    }
  });

  // Also remove tab buttons/selectors for other platforms
  $content.find('.devsite-tab, [role="tab"]').each((_, el) => {
    const label = $(el).text().toLowerCase().trim();
    const removeTabs = ['swift', 'objective-c', 'java', 'kotlin', 'python', 'go', 'php', 'ruby', 'c#', 'unity', 'dart', 'flutter', 'ios', 'android'];
    if (removeTabs.some(l => label.includes(l))) {
      $(el).remove();
    }
  });

  // ─── Convert to markdown ───────────────────────────────────────────────────
  let output = '';

  function processNode(el) {
    const $el = $(el);
    const tag = el.tagName?.toLowerCase();

    if (el.type === 'text') {
      const text = $el.text();
      if (text.trim()) output += text;
      return;
    }

    switch (tag) {
      case 'h1':
        output += `\n# ${$el.text().trim()}\n\n`;
        break;
      case 'h2':
        output += `\n## ${$el.text().trim()}\n\n`;
        break;
      case 'h3':
        output += `\n### ${$el.text().trim()}\n\n`;
        break;
      case 'h4':
        output += `\n#### ${$el.text().trim()}\n\n`;
        break;
      case 'p':
        $el.contents().each((_, child) => processNode(child));
        output += '\n\n';
        break;
      case 'pre': {
        // Code block — extract text content, wrap in markdown fences
        const codeText = $el.text().trim();
        if (codeText) {
          output += `\n\`\`\`\n${codeText}\n\`\`\`\n\n`;
        }
        break;
      }
      case 'code': {
        // Inline code (not inside <pre>)
        if ($el.parent()[0]?.tagName?.toLowerCase() !== 'pre') {
          output += `\`${$el.text().trim()}\``;
        }
        break;
      }
      case 'ul':
      case 'ol':
        $el.children('li').each((i, li) => {
          const prefix = tag === 'ol' ? `${i + 1}. ` : '- ';
          output += `${prefix}${$(li).text().trim()}\n`;
        });
        output += '\n';
        break;
      case 'table': {
        // Convert tables to readable text
        $el.find('tr').each((_, tr) => {
          const cells = [];
          $(tr).find('td, th').each((_, cell) => {
            cells.push($(cell).text().trim());
          });
          if (cells.length > 0) {
            output += cells.join(' | ') + '\n';
          }
        });
        output += '\n';
        break;
      }
      case 'a': {
        const href = $el.attr('href') || '';
        const text = $el.text().trim();
        if (text && href && !href.startsWith('#')) {
          output += `${text}`;
        } else if (text) {
          output += text;
        }
        break;
      }
      case 'strong':
      case 'b':
        output += `**${$el.text().trim()}**`;
        break;
      case 'em':
      case 'i':
        output += `*${$el.text().trim()}*`;
        break;
      case 'br':
        output += '\n';
        break;
      default:
        // For div, section, span, etc. — recurse into children
        $el.contents().each((_, child) => processNode(child));
        break;
    }
  }

  // Process all children of the content area
  $content.contents().each((_, child) => processNode(child));

  // ─── Final cleanup ─────────────────────────────────────────────────────────
  output = output
    .replace(/\n{3,}/g, '\n\n')           // Collapse excessive newlines
    .replace(/[ \t]+$/gm, '')              // Trim trailing spaces per line
    .replace(/^[ \t]+/gm, (m) => {         // Preserve code indentation, trim others
      return m;
    })
    .replace(/^\s*\n/gm, '\n')             // Remove lines that are only whitespace
    .replace(/\n{3,}/g, '\n\n')            // One more pass
    .trim();

  return output;
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