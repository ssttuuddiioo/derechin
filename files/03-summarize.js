/**
 * 03-summarize.js
 * 
 * Uses Claude API to generate structured summaries of Constitutional Court rulings.
 * 
 * Requires: ANTHROPIC_API_KEY environment variable
 * 
 * Output format per ruling:
 * {
 *   hechos: "...",              // Key facts of the case
 *   problema_juridico: "...",   // Legal question(s) at issue
 *   ratio_decidendi: "...",     // Core legal reasoning
 *   regla_decision: "...",      // Decision rule established
 *   decision: "...",            // What the Court decided
 *   salvamentos: "...",         // Dissenting/concurring opinions summary
 *   temas: ["...", "..."],      // Topic tags
 *   derechos: ["...", "..."],   // Fundamental rights involved
 *   precedente_citado: ["..."], // Referenced prior rulings
 *   cambio_precedente: bool,    // Whether this ruling changes prior precedent
 * }
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync } from 'fs';

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const TEXTOS_DIR = './data/textos';
const OUTPUT_DIR = './data/resumenes';
const MODEL = 'claude-sonnet-4-20250514';
const MAX_TEXT_CHARS = 150000; // Claude can handle ~200k tokens, but we truncate for cost

if (!ANTHROPIC_API_KEY) {
  console.error('❌ Set ANTHROPIC_API_KEY environment variable');
  console.error('   ANTHROPIC_API_KEY=sk-ant-... node src/03-summarize.js');
  process.exit(1);
}

/**
 * The prompt template for summarizing a Constitutional Court ruling
 */
function buildPrompt(rulingText, rulingId) {
  return `You are a Colombian constitutional law expert. Analyze the following ruling from the Constitutional Court of Colombia and provide a structured summary in Spanish.

<ruling_id>${rulingId}</ruling_id>

<ruling_text>
${rulingText.slice(0, MAX_TEXT_CHARS)}
</ruling_text>

Respond ONLY with a JSON object (no markdown, no backticks) with these fields:

{
  "hechos": "Brief summary of the key facts of the case (2-4 sentences)",
  "problema_juridico": "The legal question(s) the Court addressed (1-2 sentences)",
  "ratio_decidendi": "The core legal reasoning the Court used to reach its decision (2-4 sentences)",
  "regla_decision": "The specific legal rule or standard the Court established or applied (1-2 sentences)",
  "decision": "What the Court decided — the operative part of the ruling (1-2 sentences)",
  "salvamentos": "Summary of dissenting or concurring opinions, or 'No se registran' if none",
  "temas": ["array", "of", "topic", "tags", "in", "Spanish"],
  "derechos": ["array of fundamental rights involved, e.g. 'Derecho a la salud', 'Derecho a la igualdad'"],
  "precedente_citado": ["array of ruling IDs cited as precedent, e.g. 'T-760/08', 'C-239/97'"],
  "cambio_precedente": false,
  "nota_cambio": "If cambio_precedente is true, explain what changed and which prior ruling was departed from"
}

Important:
- Write everything in Spanish
- Be concise but precise — lawyers need accuracy
- For temas, use standard Constitutional Court topic classifications
- For precedente_citado, extract actual ruling IDs mentioned (format: T-NNN/YY, C-NNN/YY, SU-NNN/YY)
- Set cambio_precedente to true ONLY if the Court explicitly modifies, departs from, or overrules a prior ruling`;
}

/**
 * Call Claude API to summarize a ruling
 */
async function summarizeRuling(rulingText, rulingId) {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 2000,
      messages: [
        { role: 'user', content: buildPrompt(rulingText, rulingId) }
      ],
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Claude API error ${response.status}: ${error}`);
  }

  const data = await response.json();
  const text = data.content
    .filter(block => block.type === 'text')
    .map(block => block.text)
    .join('');

  // Parse the JSON response
  const clean = text.replace(/```json|```/g, '').trim();
  return JSON.parse(clean);
}

/**
 * Main execution
 */
async function main() {
  if (!existsSync(TEXTOS_DIR)) {
    console.error('❌ Run 02-scrape-relatoria.js first to get ruling texts.');
    process.exit(1);
  }

  if (!existsSync(OUTPUT_DIR)) mkdirSync(OUTPUT_DIR, { recursive: true });

  const files = readdirSync(TEXTOS_DIR).filter(f => f.endsWith('.json'));
  console.log(`🤖 Summarizing ${files.length} rulings with Claude...\n`);

  let success = 0;
  let failed = 0;

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const data = JSON.parse(readFileSync(`${TEXTOS_DIR}/${file}`, 'utf-8'));

    if (!data.fullText || data.error) {
      console.log(`   [${i + 1}/${files.length}] ⏭️  ${data.sentencia_id} — no text, skipping`);
      continue;
    }

    console.log(`   [${i + 1}/${files.length}] 📝 ${data.sentencia_id}...`);

    try {
      const summary = await summarizeRuling(data.fullText, data.sentencia_id);
      
      const output = {
        sentencia_id: data.sentencia_id,
        summary,
        word_count: data.wordCount,
        generated_at: new Date().toISOString(),
        model: MODEL,
      };

      const outFile = file.replace('.json', '-resumen.json');
      writeFileSync(`${OUTPUT_DIR}/${outFile}`, JSON.stringify(output, null, 2));
      
      console.log(`   ✅ ${summary.temas?.length || 0} topics, ${summary.derechos?.length || 0} rights`);
      if (summary.cambio_precedente) {
        console.log(`   ⚠️  PRECEDENT CHANGE: ${summary.nota_cambio}`);
      }
      success++;

      // Rate limit — Claude API has rate limits
      await new Promise(r => setTimeout(r, 1000));
    } catch (error) {
      console.error(`   ❌ ${error.message}`);
      failed++;
    }
  }

  console.log(`\n📊 Results: ${success} summarized, ${failed} failed`);
}

main().catch(console.error);
