/**
 * 02-scrape-relatoria.js
 * 
 * Scrapes the full text of rulings from the Constitutional Court's
 * relatoría website. Uses the URLs constructed in step 01.
 * 
 * URL Pattern:
 *   T-323/24  → https://www.corteconstitucional.gov.co/relatoria/2024/t-323-24.htm
 *   C-239/97  → https://www.corteconstitucional.gov.co/relatoria/1997/c-239-97.htm  
 *   SU-081/24 → https://www.corteconstitucional.gov.co/relatoria/2024/su081-24.htm
 * 
 * Rate limiting: 1 request per second to be respectful.
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { parse } from 'node-html-parser';

const INPUT_FILE = './data/sentencias-metadata.json';
const OUTPUT_DIR = './data/textos';
const DELAY_MS = 1000; // 1 second between requests
const MAX_CONCURRENT = 1; // sequential to be respectful
const MAX_RULINGS = 50; // limit for POC — remove for full run

/**
 * Extract clean text from a ruling HTML page
 */
function extractText(html) {
  const root = parse(html);

  // Remove scripts, styles, nav elements
  root.querySelectorAll('script, style, nav, header, footer, .menu, .sidebar').forEach(el => el.remove());

  // The ruling text is typically in the main body
  // Try common content containers
  const contentSelectors = [
    '.texto_sentencia',
    '#TextoSentencia', 
    '.WordSection1',
    'body',
  ];

  let content = null;
  for (const selector of contentSelectors) {
    const el = root.querySelector(selector);
    if (el && el.textContent.trim().length > 500) {
      content = el;
      break;
    }
  }

  if (!content) {
    content = root;
  }

  // Get text and clean it up
  let text = content.textContent
    .replace(/\r\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]+/g, ' ')
    .trim();

  // Also extract the header/descriptor text (temas, subtemas)
  // These appear at the top of most rulings in UPPERCASE
  const headerLines = text.split('\n').filter(line => {
    const trimmed = line.trim();
    return trimmed === trimmed.toUpperCase() && trimmed.length > 20 && trimmed.includes('-');
  }).slice(0, 20); // First 20 topic descriptors

  return {
    fullText: text,
    topics: headerLines.map(l => l.trim()),
    charCount: text.length,
    wordCount: text.split(/\s+/).length,
  };
}

/**
 * Fetch and parse a single ruling
 */
async function scrapeRuling(ruling) {
  if (!ruling.url_relatoria) {
    return { ...ruling, error: 'No URL available' };
  }

  try {
    const response = await fetch(ruling.url_relatoria, {
      headers: {
        'User-Agent': 'CorteConstitucionalExplorer/0.1 (academic research tool)',
        'Accept': 'text/html',
      },
    });

    if (!response.ok) {
      // Try alternate URL patterns
      // Some older rulings use different formats
      const altUrls = generateAlternateUrls(ruling);
      for (const altUrl of altUrls) {
        try {
          const altResponse = await fetch(altUrl);
          if (altResponse.ok) {
            const html = await altResponse.text();
            const extracted = extractText(html);
            return {
              sentencia_id: ruling.sentencia_id,
              url_used: altUrl,
              ...extracted,
            };
          }
        } catch { /* try next */ }
      }
      return { sentencia_id: ruling.sentencia_id, error: `HTTP ${response.status}` };
    }

    const html = await response.text();
    const extracted = extractText(html);
    
    return {
      sentencia_id: ruling.sentencia_id,
      url_used: ruling.url_relatoria,
      ...extracted,
    };
  } catch (error) {
    return { sentencia_id: ruling.sentencia_id, error: error.message };
  }
}

/**
 * Generate alternate URL patterns for edge cases
 */
function generateAlternateUrls(ruling) {
  const { sentencia_id } = ruling;
  const match = sentencia_id.match(/^(T|C|SU|A)-?(\d+)\/(\d{2,4})$/i);
  if (!match) return [];

  const [, tipo, numero, anioShort] = match;
  const anio = anioShort.length === 2
    ? (parseInt(anioShort) >= 92 ? 1900 + parseInt(anioShort) : 2000 + parseInt(anioShort))
    : parseInt(anioShort);
  const yearShort = String(anio).slice(-2);
  const t = tipo.toLowerCase();
  const n = numero;
  const nPad = numero.padStart(3, '0');

  const base = `https://www.corteconstitucional.gov.co/relatoria/${anio}`;
  
  return [
    // Without zero-padding
    `${base}/${t}-${n}-${yearShort}.htm`,
    // With different padding
    `${base}/${t}-${nPad}-${yearShort}.htm`,
    // Some use .HTM (uppercase)
    `${base}/${t}-${n}-${yearShort}.HTM`,
    // Some old ones use different separators
    `${base}/${t.toUpperCase()}-${nPad}-${yearShort}.htm`,
  ];
}

/**
 * Main execution
 */
async function main() {
  if (!existsSync(INPUT_FILE)) {
    console.error('❌ Run 01-fetch-metadata.js first to get the ruling list.');
    console.error('   Or use the sample data file.');
    process.exit(1);
  }

  if (!existsSync(OUTPUT_DIR)) mkdirSync(OUTPUT_DIR, { recursive: true });

  const rulings = JSON.parse(readFileSync(INPUT_FILE, 'utf-8'));
  const toScrape = rulings.filter(r => r.url_relatoria).slice(0, MAX_RULINGS);

  console.log(`🔍 Scraping ${toScrape.length} rulings from the relatoría...\n`);

  const results = [];
  let success = 0;
  let failed = 0;

  for (let i = 0; i < toScrape.length; i++) {
    const ruling = toScrape[i];
    console.log(`   [${i + 1}/${toScrape.length}] ${ruling.sentencia_id}...`);

    const result = await scrapeRuling(ruling);
    results.push(result);

    if (result.error) {
      console.log(`   ❌ ${result.error}`);
      failed++;
    } else {
      console.log(`   ✅ ${result.wordCount.toLocaleString()} words, ${result.topics.length} topics`);
      success++;

      // Save individual ruling text
      const filename = ruling.sentencia_id.replace('/', '-').toLowerCase();
      writeFileSync(
        `${OUTPUT_DIR}/${filename}.json`,
        JSON.stringify(result, null, 2)
      );
    }

    // Rate limit
    if (i < toScrape.length - 1) {
      await new Promise(r => setTimeout(r, DELAY_MS));
    }
  }

  console.log(`\n📊 Results: ${success} scraped, ${failed} failed`);

  // Save summary
  const summary = {
    total: toScrape.length,
    success,
    failed,
    results: results.map(r => ({
      sentencia_id: r.sentencia_id,
      wordCount: r.wordCount || 0,
      topicCount: r.topics?.length || 0,
      error: r.error || null,
    })),
  };

  writeFileSync('./data/scrape-summary.json', JSON.stringify(summary, null, 2));
  console.log('💾 Summary saved to data/scrape-summary.json');
}

main().catch(console.error);
