/**
 * ingest-csv.mjs
 *
 * Reads sentencias-all.csv (29K+ rulings) and inserts them into Supabase.
 *
 * Usage:
 *   node scripts/ingest-csv.mjs
 *   node scripts/ingest-csv.mjs --dry-run   # parse only, no insert
 *
 * Expects sentencias-all.csv in the project root.
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import path from "path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.join(__dirname, "..");

const DRY_RUN = process.argv.includes("--dry-run");
const BATCH_SIZE = 500;

const supabase = createClient(
  "https://tyvecwkxxosxlmsgeywt.supabase.co",
  process.env.SUPABASE_SERVICE_KEY ||
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR5dmVjd2t4eG9zeGxtc2dleXd0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MjQ0Mzc1MCwiZXhwIjoyMDc4MDE5NzUwfQ.zHe8JWp-373j3vKgFVup4cmhL5vpLpbP1rjIYcdmeQc"
);

// ── CSV parser (no dependencies) ──────────────────────────────────────

function parseCSV(text) {
  const lines = text.split("\n");
  const headers = parseCSVLine(lines[0]);
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const values = parseCSVLine(line);
    const row = {};
    headers.forEach((h, idx) => {
      row[h.trim()] = (values[idx] || "").trim();
    });
    rows.push(row);
  }
  return rows;
}

function parseCSVLine(line) {
  const result = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === "," && !inQuotes) {
      result.push(current);
      current = "";
    } else {
      current += ch;
    }
  }
  result.push(current);
  return result;
}

// ── URL builder ───────────────────────────────────────────────────────

function buildRelatoriaUrl(sentenciaId) {
  // Handle formats: T-012/92, C-155A/93, SU-081/24, A-001/93
  const match = sentenciaId.match(
    /^(T|C|SU|A)-?(\d+[A-Z]?)\/(\d{2,4})$/i
  );
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
  const num = numero.toLowerCase();

  // SU rulings: no dash between type and number, zero-padded to 3
  if (t === "su") {
    const padded = num.replace(/[a-z]/g, "").padStart(3, "0");
    const suffix = num.replace(/\d/g, ""); // letter suffix like "A"
    return `https://www.corteconstitucional.gov.co/relatoria/${anio}/${t}${padded}${suffix}-${yearShort}.htm`;
  }

  // T, C, A rulings: dash between type and number, zero-padded to 3
  const padded = num.replace(/[a-z]/g, "").padStart(3, "0");
  const suffix = num.replace(/\d/g, "");
  return `https://www.corteconstitucional.gov.co/relatoria/${anio}/${t}-${padded}${suffix}-${yearShort}.htm`;
}

// ── Parse sentencia ID ────────────────────────────────────────────────

function parseSentenciaId(id) {
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

  return {
    tipo: tipo.toUpperCase(),
    numero: parseInt(numero),
    anio,
  };
}

// ── Parse date ────────────────────────────────────────────────────────

function parseDate(dateStr) {
  if (!dateStr) return null;
  // Format: "02/25/1992 12:00:00 AM" or "2/25/1992 ..."
  const match = dateStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (!match) return null;
  const [, month, day, year] = match;
  return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
}

// ── Transform CSV row to DB row ───────────────────────────────────────

function transformRow(csvRow) {
  const sentenciaId = csvRow["Sentencia"]?.trim();
  if (!sentenciaId) return null;

  const parsed = parseSentenciaId(sentenciaId);
  if (!parsed) {
    return null; // Skip unparseable IDs
  }

  const fecha = parseDate(csvRow["Fecha Sentencia"]);
  const sv = csvRow["SV-SPV"]?.trim();
  const av = csvRow["AV-APV"]?.trim();

  return {
    sentencia_id: sentenciaId,
    tipo: parsed.tipo,
    numero: parsed.numero,
    anio: parsed.anio,
    fecha: fecha,
    proceso: csvRow["Proceso"]?.trim() || null,
    magistrado_ponente: csvRow["Magistrado(a) ponente"]?.trim() || null,
    sala: csvRow["Sala"]?.trim() || null,
    expediente_tipo: csvRow["Expediente Tipo"]?.trim() || null,
    expediente_numero: csvRow["Expediente Número"]?.trim() || null,
    salvamento_voto: sv && sv !== "s.d." ? sv : null,
    aclaracion_voto: av && av !== "s.d." ? av : null,
    url_relatoria: buildRelatoriaUrl(sentenciaId),
  };
}

// ── Main ──────────────────────────────────────────────────────────────

async function main() {
  const csvPath = path.join(PROJECT_ROOT, "sentencias-all.csv");
  console.log(`Reading ${csvPath}...`);

  let raw;
  try {
    raw = readFileSync(csvPath, "utf-8");
  } catch {
    console.error("ERROR: sentencias-all.csv not found in project root.");
    console.error("Place the file at:", csvPath);
    process.exit(1);
  }

  console.log("Parsing CSV...");
  const csvRows = parseCSV(raw);
  console.log(`Parsed ${csvRows.length} CSV rows.\n`);

  // Transform
  const dbRows = [];
  const skipped = [];
  for (const row of csvRows) {
    const transformed = transformRow(row);
    if (transformed) {
      dbRows.push(transformed);
    } else {
      skipped.push(row["Sentencia"] || "(empty)");
    }
  }

  console.log(`Transformed: ${dbRows.length} rows`);
  console.log(`Skipped:     ${skipped.length} rows`);
  if (skipped.length > 0 && skipped.length <= 20) {
    console.log("  Skipped IDs:", skipped.join(", "));
  } else if (skipped.length > 20) {
    console.log("  First 20 skipped:", skipped.slice(0, 20).join(", "));
  }

  // Stats
  const byTipo = {};
  const byDecade = {};
  dbRows.forEach((r) => {
    byTipo[r.tipo] = (byTipo[r.tipo] || 0) + 1;
    const decade = Math.floor(r.anio / 10) * 10;
    byDecade[decade] = (byDecade[decade] || 0) + 1;
  });
  console.log("\nBy tipo:", byTipo);
  console.log(
    "By decade:",
    Object.entries(byDecade)
      .sort(([a], [b]) => Number(a) - Number(b))
      .map(([d, c]) => `${d}s: ${c}`)
      .join(", ")
  );

  if (DRY_RUN) {
    console.log("\n--dry-run: No data inserted.");
    console.log("Sample row:", JSON.stringify(dbRows[0], null, 2));
    console.log("Sample URL:", dbRows[0]?.url_relatoria);
    return;
  }

  // Insert in batches
  console.log(`\nInserting ${dbRows.length} rows in batches of ${BATCH_SIZE}...`);
  let inserted = 0;
  let errors = 0;

  for (let i = 0; i < dbRows.length; i += BATCH_SIZE) {
    const batch = dbRows.slice(i, i + BATCH_SIZE);
    const { error } = await supabase
      .from("sentencias")
      .upsert(batch, { onConflict: "sentencia_id", ignoreDuplicates: false });

    if (error) {
      console.error(`  Batch ${i}-${i + batch.length}: ERROR`, error.message);
      errors++;
    } else {
      inserted += batch.length;
      if ((i / BATCH_SIZE) % 10 === 0 || i + BATCH_SIZE >= dbRows.length) {
        console.log(
          `  ${inserted.toLocaleString()} / ${dbRows.length.toLocaleString()} inserted`
        );
      }
    }
  }

  console.log(
    `\nDone! Inserted ${inserted.toLocaleString()} rows, ${errors} batch errors.`
  );
}

main().catch(console.error);
