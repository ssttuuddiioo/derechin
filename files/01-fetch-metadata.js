/**
 * 01-fetch-metadata.js
 * 
 * Fetches ruling metadata from Colombia's open data portal (datos.gov.co)
 * using the Socrata SODA API. No authentication required.
 * 
 * API endpoint: https://www.datos.gov.co/resource/v2k4-2t8s.json
 * 
 * Known fields from the CSV export:
 *   proceso, expediente_tipo, expediente_n_mero, magistrado_a_ponente,
 *   sala, sentencia_tipo, sentencia, fecha_sentencia, sv_spv, av_apv
 */

import { writeFileSync, existsSync, mkdirSync } from 'fs';

const API_BASE = 'https://www.datos.gov.co/resource/v2k4-2t8s.json';
const PAGE_SIZE = 50000; // Socrata allows up to 50k per request
const OUTPUT_DIR = './data';

/**
 * Construct the relatoría URL from a ruling ID like "T-323/24"
 */
function buildRelatoriaUrl(sentenciaId) {
  // Parse ruling ID: "T-323/24", "C-239/97", "SU-081/24"
  const match = sentenciaId.match(/^(T|C|SU|A)-?(\d+)\/(\d{2,4})$/i);
  if (!match) return null;

  const [, tipo, numero, anioShort] = match;
  
  // Convert 2-digit year to 4-digit
  const anio = anioShort.length === 2
    ? (parseInt(anioShort) >= 92 ? 1900 + parseInt(anioShort) : 2000 + parseInt(anioShort))
    : parseInt(anioShort);
  
  const yearShort = String(anio).slice(-2);
  const tipoLower = tipo.toLowerCase();
  
  // URL pattern: /relatoria/{year}/{type_lower}-{number}-{year_short}.htm
  // SU rulings don't have the dash: su081-24.htm (no dash between su and number)
  if (tipoLower === 'su') {
    return `https://www.corteconstitucional.gov.co/relatoria/${anio}/${tipoLower}${numero.padStart(3, '0')}-${yearShort}.htm`;
  }
  
  return `https://www.corteconstitucional.gov.co/relatoria/${anio}/${tipoLower}-${numero.padStart(3, '0')}-${yearShort}.htm`;
}

/**
 * Fetch all rulings from the Socrata API with pagination
 */
async function fetchAllMetadata() {
  let allRulings = [];
  let offset = 0;
  let hasMore = true;

  console.log('🏛️  Fetching ruling metadata from datos.gov.co...\n');

  while (hasMore) {
    const url = `${API_BASE}?$limit=${PAGE_SIZE}&$offset=${offset}&$order=fecha_sentencia DESC`;
    console.log(`   Fetching page at offset ${offset}...`);

    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`API returned ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
      if (data.length === 0) {
        hasMore = false;
      } else {
        allRulings = allRulings.concat(data);
        offset += PAGE_SIZE;
        console.log(`   Got ${data.length} rulings (total: ${allRulings.length})`);

        // If we got fewer than PAGE_SIZE, we're done
        if (data.length < PAGE_SIZE) {
          hasMore = false;
        }
      }

      // Rate limit: wait 500ms between requests
      await new Promise(r => setTimeout(r, 500));
    } catch (error) {
      console.error(`   ❌ Error fetching: ${error.message}`);
      hasMore = false;
    }
  }

  return allRulings;
}

/**
 * Transform raw API data into our normalized format
 */
function transformRuling(raw) {
  const sentenciaId = raw.sentencia?.trim();
  if (!sentenciaId) return null;

  const match = sentenciaId.match(/^(T|C|SU|A)-?(\d+)\/(\d{2,4})$/i);
  
  return {
    sentencia_id: sentenciaId,
    tipo: raw.sentencia_tipo || (match ? match[1].toUpperCase() : null),
    numero: match ? parseInt(match[2]) : null,
    anio: raw.fecha_sentencia
      ? new Date(raw.fecha_sentencia).getFullYear()
      : (match ? (parseInt(match[3]) >= 92 ? 1900 + parseInt(match[3]) : 2000 + parseInt(match[3])) : null),
    fecha: raw.fecha_sentencia || null,
    magistrado_ponente: raw.magistrado_a_ponente || null,
    sala: raw.sala || null,
    proceso: raw.proceso || null,
    expediente_tipo: raw.expediente_tipo || null,
    expediente_numero: raw.expediente_n_mero || null,
    salvamento_voto: raw.sv_spv || null,
    aclaracion_voto: raw.av_apv || null,
    url_relatoria: buildRelatoriaUrl(sentenciaId),
  };
}

/**
 * Main execution
 */
async function main() {
  if (!existsSync(OUTPUT_DIR)) mkdirSync(OUTPUT_DIR, { recursive: true });

  const raw = await fetchAllMetadata();
  
  console.log(`\n📊 Total raw records: ${raw.length}`);

  // Transform and filter out invalid records
  const rulings = raw.map(transformRuling).filter(Boolean);
  
  console.log(`✅ Valid rulings: ${rulings.length}`);

  // Stats
  const byType = {};
  const byYear = {};
  rulings.forEach(r => {
    byType[r.tipo] = (byType[r.tipo] || 0) + 1;
    if (r.anio) byYear[r.anio] = (byYear[r.anio] || 0) + 1;
  });

  console.log('\n📋 By type:');
  Object.entries(byType).sort((a, b) => b[1] - a[1]).forEach(([t, c]) => {
    console.log(`   ${t}: ${c.toLocaleString()} rulings`);
  });

  console.log('\n📅 Recent years:');
  Object.entries(byYear).sort((a, b) => b[0] - a[0]).slice(0, 5).forEach(([y, c]) => {
    console.log(`   ${y}: ${c} rulings`);
  });

  // Save to file
  const outputPath = `${OUTPUT_DIR}/sentencias-metadata.json`;
  writeFileSync(outputPath, JSON.stringify(rulings, null, 2));
  console.log(`\n💾 Saved to ${outputPath}`);

  // Also save a small sample for testing
  const sample = rulings.slice(0, 20);
  writeFileSync(`${OUTPUT_DIR}/sentencias-sample.json`, JSON.stringify(sample, null, 2));
  console.log(`💾 Sample (20 rulings) saved to ${OUTPUT_DIR}/sentencias-sample.json`);
}

main().catch(console.error);
