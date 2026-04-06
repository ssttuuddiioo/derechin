import { getSupabase } from "./supabase";
import type {
  SentenciaMetadata,
  SentenciaSummary,
  SentenciaTexto,
  SentenciaFull,
} from "./types";
import { sentenciaIdToSlug } from "./utils";

export async function getAllSentencias(): Promise<SentenciaMetadata[]> {
  const sb = getSupabase();
  const { data, error } = await sb
    .from("sentencias")
    .select("*")
    .order("fecha", { ascending: false });

  if (error) throw error;

  return (data || []).map((row) => ({
    sentencia_id: row.sentencia_id,
    tipo: row.tipo,
    numero: row.numero,
    anio: row.anio,
    fecha: row.fecha,
    magistrado_ponente: row.magistrado_ponente,
    sala: row.sala,
    proceso: row.proceso,
    expediente_tipo: row.expediente_tipo,
    expediente_numero: row.expediente_numero,
    salvamento_voto: row.salvamento_voto,
    aclaracion_voto: row.aclaracion_voto,
    url_relatoria: row.url_relatoria,
  }));
}

export async function getSummary(
  sentenciaId: string
): Promise<SentenciaSummary | null> {
  const { data, error } = await getSupabase()
    .from("sentencia_resumenes")
    .select("*")
    .eq("sentencia_id", sentenciaId)
    .maybeSingle();

  if (error || !data) return null;

  return {
    hechos: data.hechos,
    problema_juridico: data.problema_juridico,
    ratio_decidendi: data.ratio_decidendi,
    regla_decision: data.regla_decision,
    decision: data.decision,
    salvamentos_resumen: data.salvamentos_resumen,
    temas: data.temas || [],
    derechos: data.derechos || [],
    precedente_citado: data.precedente_citado || [],
    cambio_precedente: data.cambio_precedente || false,
    nota_cambio: data.nota_cambio || "",
  };
}

export async function getTexto(
  sentenciaId: string
): Promise<SentenciaTexto | null> {
  const { data, error } = await getSupabase()
    .from("sentencia_textos")
    .select("*")
    .eq("sentencia_id", sentenciaId)
    .maybeSingle();

  if (error || !data) return null;

  return {
    sentencia_id: data.sentencia_id,
    fullText: data.texto_completo,
    topics: data.temas_header || [],
    charCount: data.char_count || 0,
    wordCount: data.word_count || 0,
  };
}

export async function getSentenciaBySlug(
  slug: string
): Promise<SentenciaFull | null> {
  const all = await getAllSentencias();
  const metadata = all.find(
    (s) => sentenciaIdToSlug(s.sentencia_id) === slug
  );
  if (!metadata) return null;

  const [summary, texto] = await Promise.all([
    getSummary(metadata.sentencia_id),
    getTexto(metadata.sentencia_id),
  ]);

  return { metadata, summary, texto };
}

export async function getAllSlugs(): Promise<string[]> {
  const all = await getAllSentencias();
  return all.map((s) => sentenciaIdToSlug(s.sentencia_id));
}

export async function getFilterOptions() {
  const all = await getAllSentencias();
  const tipos = Array.from(new Set(all.map((s) => s.tipo))).sort();
  const anios = Array.from(new Set(all.map((s) => s.anio))).sort(
    (a, b) => b - a
  );
  const magistrados = Array.from(
    new Set(all.map((s) => s.magistrado_ponente))
  ).sort();

  const { data: resumenes } = await getSupabase()
    .from("sentencia_resumenes")
    .select("temas");

  const temas = new Set<string>();
  (resumenes || []).forEach((r) => {
    (r.temas || []).forEach((t: string) => temas.add(t));
  });

  return { tipos, anios, magistrados, temas: Array.from(temas).sort() };
}

export async function getSummaries(): Promise<
  Record<string, SentenciaSummary>
> {
  const { data, error } = await getSupabase()
    .from("sentencia_resumenes")
    .select("*");

  if (error || !data) return {};

  const result: Record<string, SentenciaSummary> = {};
  data.forEach((row) => {
    result[row.sentencia_id] = {
      hechos: row.hechos,
      problema_juridico: row.problema_juridico,
      ratio_decidendi: row.ratio_decidendi,
      regla_decision: row.regla_decision,
      decision: row.decision,
      salvamentos_resumen: row.salvamentos_resumen,
      temas: row.temas || [],
      derechos: row.derechos || [],
      precedente_citado: row.precedente_citado || [],
      cambio_precedente: row.cambio_precedente || false,
      nota_cambio: row.nota_cambio || "",
    };
  });
  return result;
}

export async function getRelatedSentencias(
  temas: string[],
  currentId: string,
  limit = 10
): Promise<
  Array<{
    sentencia_id: string;
    tipo: string;
    fecha: string;
    magistrado_ponente: string;
    temas: string[];
    shared_temas: string[];
  }>
> {
  if (!temas || temas.length === 0) return [];

  const sb = getSupabase();
  const { data, error } = await sb
    .from("sentencia_resumenes")
    .select("sentencia_id, temas")
    .overlaps("temas", temas)
    .neq("sentencia_id", currentId)
    .limit(100);

  if (error || !data) return [];

  // Score by number of shared temas
  const scored = data.map((row) => {
    const shared = (row.temas || []).filter((t: string) => temas.includes(t));
    return { sentencia_id: row.sentencia_id, temas: row.temas || [], shared_temas: shared, score: shared.length };
  });

  scored.sort((a, b) => b.score - a.score);
  const top = scored.slice(0, limit);

  // Get metadata for top results
  const ids = top.map((r) => r.sentencia_id);
  if (ids.length === 0) return [];

  const { data: sentencias } = await sb
    .from("sentencias")
    .select("sentencia_id, tipo, fecha, magistrado_ponente")
    .in("sentencia_id", ids);

  const metaMap = new Map(
    (sentencias || []).map((s) => [s.sentencia_id, s])
  );

  return top.map((r) => {
    const meta = metaMap.get(r.sentencia_id);
    return {
      sentencia_id: r.sentencia_id,
      tipo: meta?.tipo || "T",
      fecha: meta?.fecha || "",
      magistrado_ponente: meta?.magistrado_ponente || "",
      temas: r.temas,
      shared_temas: r.shared_temas,
    };
  });
}
