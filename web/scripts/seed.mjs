/**
 * Seed script — loads mock data into Supabase.
 * Run: node scripts/seed.mjs
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync, readdirSync, existsSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, "..", "data");

const supabase = createClient(
  "https://tyvecwkxxosxlmsgeywt.supabase.co",
  process.env.SUPABASE_SERVICE_KEY ||
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR5dmVjd2t4eG9zeGxtc2dleXd0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MjQ0Mzc1MCwiZXhwIjoyMDc4MDE5NzUwfQ.zHe8JWp-373j3vKgFVup4cmhL5vpLpbP1rjIYcdmeQc"
);

async function seed() {
  console.log("Seeding Supabase...\n");

  // 1. Seed sentencias metadata
  const metadata = JSON.parse(
    readFileSync(path.join(DATA_DIR, "sentencias-metadata.json"), "utf-8")
  );
  console.log(`Inserting ${metadata.length} sentencias...`);
  const { error: metaErr } = await supabase
    .from("sentencias")
    .upsert(metadata, { onConflict: "sentencia_id" });
  if (metaErr) {
    console.error("Error inserting sentencias:", metaErr.message);
  } else {
    console.log("  OK");
  }

  // 2. Seed resumenes
  const resDir = path.join(DATA_DIR, "resumenes");
  if (existsSync(resDir)) {
    const files = readdirSync(resDir).filter((f) => f.endsWith(".json"));
    console.log(`\nInserting ${files.length} resumenes...`);
    for (const file of files) {
      const raw = JSON.parse(readFileSync(path.join(resDir, file), "utf-8"));
      const row = {
        sentencia_id: raw.sentencia_id,
        ...raw.summary,
        generated_at: raw.generated_at,
        model_version: raw.model,
      };
      const { error } = await supabase
        .from("sentencia_resumenes")
        .upsert(row, { onConflict: "sentencia_id" });
      if (error) {
        console.error(`  Error ${file}:`, error.message);
      } else {
        console.log(`  OK: ${raw.sentencia_id}`);
      }
    }
  }

  // 3. Seed textos
  const txtDir = path.join(DATA_DIR, "textos");
  if (existsSync(txtDir)) {
    const files = readdirSync(txtDir).filter((f) => f.endsWith(".json"));
    console.log(`\nInserting ${files.length} textos...`);
    for (const file of files) {
      const raw = JSON.parse(readFileSync(path.join(txtDir, file), "utf-8"));
      const row = {
        sentencia_id: raw.sentencia_id,
        texto_completo: raw.fullText,
        temas_header: raw.topics,
        word_count: raw.wordCount,
        char_count: raw.charCount,
      };
      const { error } = await supabase
        .from("sentencia_textos")
        .upsert(row, { onConflict: "sentencia_id" });
      if (error) {
        console.error(`  Error ${file}:`, error.message);
      } else {
        console.log(`  OK: ${raw.sentencia_id}`);
      }
    }
  }

  console.log("\nDone!");
}

seed().catch(console.error);
