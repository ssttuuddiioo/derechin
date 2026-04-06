/**
 * ingest-xlsx.mjs
 *
 * Reads all .xlsx files from sentencias/ directory and loads enriched
 * data into Supabase (sentencias + sentencia_resumenes).
 *
 * Usage:
 *   node scripts/ingest-xlsx.mjs --dry-run
 *   node scripts/ingest-xlsx.mjs
 */

import { createClient } from "@supabase/supabase-js";
import { readdirSync, readFileSync } from "fs";
import XLSX from "xlsx";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SENTENCIAS_DIR = path.join(__dirname, "..", "..", "sentencias");
const DRY_RUN = process.argv.includes("--dry-run");
const BATCH_SIZE = 200;

const supabase = createClient(
  "https://tyvecwkxxosxlmsgeywt.supabase.co",
  process.env.SUPABASE_SERVICE_KEY ||
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR5dmVjd2t4eG9zeGxtc2dleXd0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MjQ0Mzc1MCwiZXhwIjoyMDc4MDE5NzUwfQ.zHe8JWp-373j3vKgFVup4cmhL5vpLpbP1rjIYcdmeQc"
);

// ── Parse temas string into array ─────────────────────────────────────

function parseTemas(temasStr) {
  if (!temasStr || temasStr === "Sin Información") return [];
  return temasStr
    .split(/\n/)
    .map((t) => t.trim())
    .filter((t) => t.length > 0)
    .map((t) => {
      // Clean up extra whitespace within tema
      return t.replace(/\s+/g, " ").trim();
    });
}

// ── Parse sentencia ID ────────────────────────────────────────────────

function parseSentenciaId(id) {
  if (!id) return null;
  id = String(id).trim();
  const match = id.match(/^(T|C|SU|A)-?(\d+[A-Z]?)\/(\d{2,4})$/i);
  if (!match) return null;
  const [, tipo, numero, anioShort] = match;
  const anioNum = parseInt(anioShort);
  const anio =
    anioShort.length === 4
      ? anioNum
      : anioNum >= 92
        ? 1900 + anioNum
        : 2000 + anioNum;
  return { tipo: tipo.toUpperCase(), numero: parseInt(numero), anio };
}

// ── Build relatoría URL ───────────────────────────────────────────────

function buildUrl(sentenciaId) {
  const match = sentenciaId.match(/^(T|C|SU|A)-?(\d+[A-Z]?)\/(\d{2,4})$/i);
  if (!match) return null;
  const [, tipo, numero, anioShort] = match;
  const anioNum = parseInt(anioShort);
  const anio =
    anioShort.length === 4
      ? anioNum
      : anioNum >= 92
        ? 1900 + anioNum
        : 2000 + anioNum;
  const yearShort = String(anio).slice(-2);
  const t = tipo.toLowerCase();
  const num = numero.toLowerCase().replace(/[a-z]/g, "").padStart(3, "0");
  const suffix = numero.toLowerCase().replace(/\d/g, "");
  if (t === "su") {
    return `https://www.corteconstitucional.gov.co/relatoria/${anio}/${t}${num}${suffix}-${yearShort}.htm`;
  }
  return `https://www.corteconstitucional.gov.co/relatoria/${anio}/${t}-${num}${suffix}-${yearShort}.htm`;
}

// ── Clean value ───────────────────────────────────────────────────────

function clean(val) {
  if (!val || val === "Sin Información") return null;
  const s = String(val).trim();
  return s.length > 0 ? s : null;
}

// ── Parse one Excel file ──────────────────────────────────────────────

function parseFile(filePath) {
  const wb = XLSX.readFile(filePath);
  const ws = wb.Sheets[wb.SheetNames[0]];
  const data = XLSX.utils.sheet_to_json(ws, { header: 1 });

  // Find header row (starts with "No.")
  const headerIdx = data.findIndex((r) => r && r[0] === "No.");
  if (headerIdx < 0) {
    console.log(`  WARNING: No header row found in ${path.basename(filePath)}`);
    return [];
  }

  const headers = data[headerIdx];
  const colMap = {};
  headers.forEach((h, i) => {
    if (h) colMap[String(h).trim()] = i;
  });

  const rows = [];
  for (let i = headerIdx + 1; i < data.length; i++) {
    const row = data[i];
    if (!row) continue;

    const sentenciaId = clean(row[colMap["Número de la providencia"]]);
    if (!sentenciaId) continue;

    const parsed = parseSentenciaId(sentenciaId);
    if (!parsed) continue;

    // Parse fecha
    let fecha = null;
    const fechaRaw = row[colMap["Fecha de la providencia"]];
    if (fechaRaw) {
      if (typeof fechaRaw === "number") {
        // Excel serial date
        const d = XLSX.SSF.parse_date_code(fechaRaw);
        fecha = `${d.y}-${String(d.m).padStart(2, "0")}-${String(d.d).padStart(2, "0")}`;
      } else {
        const m = String(fechaRaw).match(/(\d{4})-(\d{2})-(\d{2})/);
        if (m) fecha = m[0];
      }
    }

    const temas = parseTemas(row[colMap["Temas y subtemas"]]);
    const resumen = clean(row[colMap["Resumen"]]);
    const decision = clean(row[colMap["Resuelve/Decisión"]]);
    const temaPrimario = clean(row[colMap["Tema"]]);
    const normas = clean(row[colMap["Normas"]]);
    const demandado = clean(row[colMap["Demandado"]]);
    const demandante = clean(row[colMap["Demandante"]]);
    const svRaw = clean(row[colMap["Magistrado(s) Salvamento/Aclaración"]]);

    rows.push({
      sentencia: {
        sentencia_id: sentenciaId,
        tipo: parsed.tipo,
        numero: parsed.numero,
        anio: parsed.anio,
        fecha,
        magistrado_ponente: clean(row[colMap["Magistrado(s) Ponentes"]]),
        sala: clean(row[colMap["Sala de seguimiento"]]),
        proceso: clean(row[colMap["Tipo de proceso"]]),
        expediente_tipo: parsed.tipo,
        expediente_numero: clean(row[colMap["Expediente"]]),
        salvamento_voto: svRaw,
        aclaracion_voto: null,
        url_relatoria: buildUrl(sentenciaId),
      },
      resumen: {
        sentencia_id: sentenciaId,
        hechos: resumen,
        problema_juridico: null,
        ratio_decidendi: null,
        regla_decision: null,
        decision: decision ? decision.slice(0, 10000) : null,
        salvamentos_resumen: svRaw,
        temas,
        derechos: [],
        normas_demandadas: normas ? normas.split(/[;\n]/).map((n) => n.trim()).filter(Boolean) : [],
        precedente_citado: [],
        cambio_precedente: false,
        nota_cambio: null,
        generated_at: new Date().toISOString(),
        model_version: "excel-relatoria",
      },
      extra: { demandado, demandante, temaPrimario },
    });
  }

  return rows;
}

// ── Main ──────────────────────────────────────────────────────────────

async function main() {
  console.log("Reading Excel files from:", SENTENCIAS_DIR);

  const files = readdirSync(SENTENCIAS_DIR).filter((f) =>
    f.endsWith(".xlsx")
  );
  console.log(`Found ${files.length} .xlsx files\n`);

  // Parse all files
  const allRows = new Map(); // deduplicate by sentencia_id
  let totalParsed = 0;

  for (const file of files) {
    const filePath = path.join(SENTENCIAS_DIR, file);
    const rows = parseFile(filePath);
    console.log(`  ${file}: ${rows.length} rows`);
    totalParsed += rows.length;

    for (const row of rows) {
      // Keep the entry with more data (longer temas list)
      const existing = allRows.get(row.sentencia.sentencia_id);
      if (
        !existing ||
        row.resumen.temas.length > existing.resumen.temas.length
      ) {
        allRows.set(row.sentencia.sentencia_id, row);
      }
    }
  }

  const unique = Array.from(allRows.values());
  console.log(`\nTotal parsed: ${totalParsed}`);
  console.log(`Unique sentencias: ${unique.length}`);

  // Stats
  const byTipo = {};
  const withTemas = unique.filter((r) => r.resumen.temas.length > 0).length;
  const withResumen = unique.filter((r) => r.resumen.hechos).length;
  const withDecision = unique.filter((r) => r.resumen.decision).length;
  unique.forEach((r) => {
    byTipo[r.sentencia.tipo] = (byTipo[r.sentencia.tipo] || 0) + 1;
  });

  console.log("\nBy tipo:", byTipo);
  console.log(`With temas: ${withTemas}`);
  console.log(`With resumen: ${withResumen}`);
  console.log(`With decisión: ${withDecision}`);

  // Count unique temas
  const allTemas = new Set();
  unique.forEach((r) => r.resumen.temas.forEach((t) => allTemas.add(t)));
  console.log(`Unique temas: ${allTemas.size}`);

  if (DRY_RUN) {
    console.log("\n--dry-run: No data inserted.");
    console.log("\nSample sentencia:", JSON.stringify(unique[0].sentencia, null, 2));
    console.log("\nSample temas:", unique[0].resumen.temas);
    console.log("\nTop 10 temas:");
    const temaCount = {};
    unique.forEach((r) =>
      r.resumen.temas.forEach((t) => {
        temaCount[t] = (temaCount[t] || 0) + 1;
      })
    );
    Object.entries(temaCount)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .forEach(([tema, count]) => console.log(`  ${count}x ${tema}`));
    return;
  }

  // ── Insert sentencias ─────────────────────────────────────────────
  console.log(`\nUpserting ${unique.length} sentencias...`);
  let sentInserted = 0;
  const sentRows = unique.map((r) => r.sentencia);

  for (let i = 0; i < sentRows.length; i += BATCH_SIZE) {
    const batch = sentRows.slice(i, i + BATCH_SIZE);
    const { error } = await supabase
      .from("sentencias")
      .upsert(batch, { onConflict: "sentencia_id" });
    if (error) {
      console.error(`  Sentencias batch ${i}: ERROR`, error.message);
    } else {
      sentInserted += batch.length;
    }
    if (i % 1000 === 0 || i + BATCH_SIZE >= sentRows.length) {
      console.log(`  ${sentInserted} / ${sentRows.length}`);
    }
  }

  // ── Insert resumenes ──────────────────────────────────────────────
  const resRows = unique
    .filter((r) => r.resumen.temas.length > 0 || r.resumen.hechos || r.resumen.decision)
    .map((r) => r.resumen);

  console.log(`\nUpserting ${resRows.length} resumenes...`);
  let resInserted = 0;

  for (let i = 0; i < resRows.length; i += BATCH_SIZE) {
    const batch = resRows.slice(i, i + BATCH_SIZE);
    const { error } = await supabase
      .from("sentencia_resumenes")
      .upsert(batch, { onConflict: "sentencia_id" });
    if (error) {
      console.error(`  Resumenes batch ${i}: ERROR`, error.message);
    } else {
      resInserted += batch.length;
    }
    if (i % 1000 === 0 || i + BATCH_SIZE >= resRows.length) {
      console.log(`  ${resInserted} / ${resRows.length}`);
    }
  }

  console.log(`\nDone! Sentencias: ${sentInserted}, Resumenes: ${resInserted}`);
}

main().catch(console.error);
