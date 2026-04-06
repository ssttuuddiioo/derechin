/**
 * 04-preview.js
 * 
 * Preview the data pipeline results. Works with either real API data
 * or the built-in sample data (for testing without network access).
 * 
 * Run: node src/04-preview.js
 */

import { readFileSync, existsSync, readdirSync } from 'fs';

// ─── Sample data from the actual CSV export ────────────────────────────
// These are real records from the datos.gov.co dataset
const SAMPLE_DATA = [
  { sentencia: "T-012/92", sentencia_tipo: "T", proceso: "Tutela", fecha_sentencia: "1992-02-25", magistrado_a_ponente: "José Gregorio Hernández Galindo", sala: "Salas de Revisión" },
  { sentencia: "T-001/92", sentencia_tipo: "T", proceso: "Tutela", fecha_sentencia: "1992-04-03", magistrado_a_ponente: "José Gregorio Hernández Galindo", sala: "Salas de Revisión" },
  { sentencia: "C-004/92", sentencia_tipo: "C", proceso: "Decreto Legislativo", fecha_sentencia: "1992-05-07", magistrado_a_ponente: "Eduardo Cifuentes Muñoz", sala: "Sala Plena" },
  { sentencia: "C-239/97", sentencia_tipo: "C", proceso: "Demanda de inconstitucionalidad", fecha_sentencia: "1997-05-20", magistrado_a_ponente: "Carlos Gaviria Díaz", sala: "Sala Plena" },
  { sentencia: "T-760/08", sentencia_tipo: "T", proceso: "Tutela", fecha_sentencia: "2008-07-31", magistrado_a_ponente: "Manuel José Cepeda Espinosa", sala: "Sala Plena" },
  { sentencia: "C-355/06", sentencia_tipo: "C", proceso: "Demanda de inconstitucionalidad", fecha_sentencia: "2006-05-10", magistrado_a_ponente: "Jaime Araújo Rentería", sala: "Sala Plena" },
  { sentencia: "T-025/04", sentencia_tipo: "T", proceso: "Tutela", fecha_sentencia: "2004-01-22", magistrado_a_ponente: "Manuel José Cepeda Espinosa", sala: "Sala Plena" },
  { sentencia: "SU-081/24", sentencia_tipo: "SU", proceso: "Tutela", fecha_sentencia: "2024-03-14", magistrado_a_ponente: "Diana Fajardo Rivera", sala: "Sala Plena" },
  { sentencia: "T-323/24", sentencia_tipo: "T", proceso: "Tutela", fecha_sentencia: "2024-09-05", magistrado_a_ponente: "Vladimir Fernández Andrade", sala: "Salas de Revisión" },
  { sentencia: "C-055/22", sentencia_tipo: "C", proceso: "Demanda de inconstitucionalidad", fecha_sentencia: "2022-02-21", magistrado_a_ponente: "Antonio José Lizarazo Ocampo", sala: "Sala Plena" },
  { sentencia: "T-388/09", sentencia_tipo: "T", proceso: "Tutela", fecha_sentencia: "2009-05-28", magistrado_a_ponente: "Humberto Antonio Sierra Porto", sala: "Salas de Revisión" },
  { sentencia: "T-067/25", sentencia_tipo: "T", proceso: "Tutela", fecha_sentencia: "2025-02-20", magistrado_a_ponente: "Juan Carlos Cortés González", sala: "Salas de Revisión" },
];

// ─── URL Construction Logic ────────────────────────────────────────────
function buildRelatoriaUrl(sentenciaId) {
  const match = sentenciaId.match(/^(T|C|SU|A)-?(\d+)\/(\d{2,4})$/i);
  if (!match) return null;
  const [, tipo, numero, anioShort] = match;
  const anio = anioShort.length === 2
    ? (parseInt(anioShort) >= 92 ? 1900 + parseInt(anioShort) : 2000 + parseInt(anioShort))
    : parseInt(anioShort);
  const yearShort = String(anio).slice(-2);
  const t = tipo.toLowerCase();
  if (t === 'su') {
    return `https://www.corteconstitucional.gov.co/relatoria/${anio}/${t}${numero.padStart(3, '0')}-${yearShort}.htm`;
  }
  return `https://www.corteconstitucional.gov.co/relatoria/${anio}/${t}-${numero.padStart(3, '0')}-${yearShort}.htm`;
}

// ─── Main ──────────────────────────────────────────────────────────────
function main() {
  console.log('═══════════════════════════════════════════════════════');
  console.log('  CORTE CONSTITUCIONAL EXPLORER — Data Pipeline Preview');
  console.log('═══════════════════════════════════════════════════════\n');

  // Check if we have real data from the API
  const hasRealData = existsSync('./data/sentencias-metadata.json');
  
  if (hasRealData) {
    const data = JSON.parse(readFileSync('./data/sentencias-metadata.json', 'utf-8'));
    console.log(`📊 Real API data loaded: ${data.length.toLocaleString()} rulings\n`);
    previewData(data.slice(0, 12));

    // Check for scraped texts
    if (existsSync('./data/textos')) {
      const texts = readdirSync('./data/textos').filter(f => f.endsWith('.json'));
      console.log(`\n📝 Scraped texts: ${texts.length} rulings`);
    }

    // Check for summaries
    if (existsSync('./data/resumenes')) {
      const summaries = readdirSync('./data/resumenes').filter(f => f.endsWith('.json'));
      console.log(`🤖 AI summaries: ${summaries.length} rulings`);

      if (summaries.length > 0) {
        console.log('\n── Sample Summary ─────────────────────────────────');
        const sample = JSON.parse(readFileSync(`./data/resumenes/${summaries[0]}`, 'utf-8'));
        console.log(JSON.stringify(sample.summary, null, 2));
      }
    }
  } else {
    console.log('📋 Using built-in sample data (run `npm run fetch` for real API data)\n');
    previewData(SAMPLE_DATA.map(d => ({
      sentencia_id: d.sentencia,
      tipo: d.sentencia_tipo,
      fecha: d.fecha_sentencia,
      magistrado_ponente: d.magistrado_a_ponente,
      sala: d.sala,
      proceso: d.proceso,
      url_relatoria: buildRelatoriaUrl(d.sentencia),
    })));
  }

  // Show the Socrata API examples
  console.log('\n═══════════════════════════════════════════════════════');
  console.log('  API QUERY EXAMPLES (copy-paste into terminal)');
  console.log('═══════════════════════════════════════════════════════\n');

  const queries = [
    {
      desc: 'Get total count of all rulings',
      url: 'https://www.datos.gov.co/resource/v2k4-2t8s.json?$select=count(*)',
    },
    {
      desc: 'Get first 5 rulings (most recent)',
      url: 'https://www.datos.gov.co/resource/v2k4-2t8s.json?$limit=5&$order=fecha_sentencia%20DESC',
    },
    {
      desc: 'Get all 2024 Tutela rulings',
      url: "https://www.datos.gov.co/resource/v2k4-2t8s.json?sentencia_tipo=T&$where=fecha_sentencia>'2024-01-01'&$limit=500",
    },
    {
      desc: 'Get all Constitutionality rulings (type C)',
      url: 'https://www.datos.gov.co/resource/v2k4-2t8s.json?sentencia_tipo=C&$limit=10',
    },
    {
      desc: 'Get rulings by a specific magistrate',
      url: 'https://www.datos.gov.co/resource/v2k4-2t8s.json?magistrado_a_ponente=Diana%20Constanza%20Fajardo%20Rivera&$limit=10',
    },
    {
      desc: 'Count rulings by type',
      url: 'https://www.datos.gov.co/resource/v2k4-2t8s.json?$select=sentencia_tipo,count(*)&$group=sentencia_tipo',
    },
    {
      desc: 'Count rulings per year (last 5 years)',
      url: "https://www.datos.gov.co/resource/v2k4-2t8s.json?$select=date_trunc_y(fecha_sentencia)%20as%20year,count(*)&$group=year&$order=year%20DESC&$limit=5",
    },
    {
      desc: 'Download full dataset as CSV',
      url: 'https://www.datos.gov.co/api/views/v2k4-2t8s/rows.csv?accessType=DOWNLOAD',
    },
  ];

  queries.forEach(q => {
    console.log(`  # ${q.desc}`);
    console.log(`  curl "${q.url}"\n`);
  });

  // Pipeline status
  console.log('═══════════════════════════════════════════════════════');
  console.log('  PIPELINE STATUS');
  console.log('═══════════════════════════════════════════════════════\n');
  console.log(`  ${hasRealData ? '✅' : '⬜'} Step 1: Fetch metadata     (npm run fetch)`);
  console.log(`  ${existsSync('./data/textos') ? '✅' : '⬜'} Step 2: Scrape full text    (npm run scrape)`);
  console.log(`  ${existsSync('./data/resumenes') ? '✅' : '⬜'} Step 3: AI summaries       (npm run summarize)`);
  console.log(`  ⬜ Step 4: Load into Supabase  (next phase)`);
  console.log(`  ⬜ Step 5: Build Next.js app    (next phase)\n`);
}

function previewData(rulings) {
  console.log('── Sample Rulings ─────────────────────────────────────\n');

  // Group by type
  const byType = {};
  rulings.forEach(r => {
    const t = r.tipo || r.sentencia_tipo || '?';
    if (!byType[t]) byType[t] = [];
    byType[t].push(r);
  });

  Object.entries(byType).forEach(([type, items]) => {
    const typeNames = { T: 'Tutela', C: 'Constitutionality', SU: 'Unification', A: 'Auto' };
    console.log(`  📂 ${typeNames[type] || type} (${type}) — ${items.length} rulings`);
    items.forEach(r => {
      const id = r.sentencia_id || r.sentencia;
      const date = r.fecha ? r.fecha.split('T')[0] : '?';
      const mag = (r.magistrado_ponente || r.magistrado_a_ponente || '?').split(' ').slice(-2).join(' ');
      const url = r.url_relatoria || buildRelatoriaUrl(id);
      console.log(`     ${id.padEnd(12)} ${date}  ${mag.padEnd(22)} ${url}`);
    });
    console.log('');
  });

  // Landmark rulings with context
  const landmarks = {
    'C-239/97': 'Euthanasia — decriminalized physician-assisted death for terminal patients',
    'T-760/08': 'Right to health — structural ruling ordering reform of the health system',
    'C-355/06': 'Abortion — decriminalized in three specific circumstances',
    'T-025/04': 'Forced displacement — declared unconstitutional state of affairs',
    'C-055/22': 'Abortion — extended decriminalization to 24 weeks',
    'T-323/24': 'AI in judicial decisions — first ruling on use of ChatGPT by judges',
    'T-067/25': 'Algorithmic transparency — access to source code of gov apps',
  };

  const found = rulings.filter(r => landmarks[r.sentencia_id || r.sentencia]);
  if (found.length > 0) {
    console.log('── Landmark Rulings in Sample ──────────────────────────\n');
    found.forEach(r => {
      const id = r.sentencia_id || r.sentencia;
      console.log(`  ⭐ ${id}: ${landmarks[id]}`);
    });
    console.log('');
  }
}

main();
