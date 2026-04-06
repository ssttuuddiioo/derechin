import { getSupabase } from "@/lib/supabase";
import SearchResults from "@/components/SearchResults";

export const dynamic = "force-dynamic";

export interface TrendingItem {
  sentencia_id: string;
  tipo: string;
  fecha: string;
  magistrado_ponente: string;
  url_relatoria: string;
  temas: string[];
  snippet: string;
}

async function getTrending(): Promise<TrendingItem[]> {
  const sb = getSupabase();

  // Get resumenes with rich temas + decision
  const { data: resumenes } = await sb
    .from("sentencia_resumenes")
    .select("sentencia_id, temas, hechos, decision")
    .not("temas", "is", null)
    .not("decision", "is", null)
    .limit(300);

  if (!resumenes || resumenes.length === 0) return [];

  // Pick diverse results (different root temas)
  const seen = new Set<string>();
  const picks: typeof resumenes = [];
  for (const r of resumenes) {
    if (!r.temas || r.temas.length < 2) continue;
    const root = r.temas[0]?.split("-")[0]?.trim();
    if (!seen.has(root) && picks.length < 8) {
      seen.add(root);
      picks.push(r);
    }
  }

  // Get metadata for picks
  const ids = picks.map((r) => r.sentencia_id);
  const { data: metas } = await sb
    .from("sentencias")
    .select("sentencia_id, tipo, fecha, magistrado_ponente, url_relatoria")
    .in("sentencia_id", ids);

  const metaMap = new Map(
    (metas || []).map((m) => [m.sentencia_id, m])
  );

  return picks.map((r) => {
    const meta = metaMap.get(r.sentencia_id);
    let snippet = "";
    if (r.hechos && r.hechos.length > 10 && r.hechos !== "Sin Informaci\u00f3n") {
      snippet = r.hechos.slice(0, 160);
    } else if (r.decision) {
      snippet = r.decision.slice(0, 160);
    }
    return {
      sentencia_id: r.sentencia_id,
      tipo: meta?.tipo || "T",
      fecha: meta?.fecha || "",
      magistrado_ponente: meta?.magistrado_ponente || "",
      url_relatoria: meta?.url_relatoria || "",
      temas: (r.temas || []).slice(0, 3),
      snippet,
    };
  });
}

export default async function Home() {
  const trending = await getTrending();

  return (
    <div className="max-w-6xl mx-auto px-6">
      <section className="pt-24 pb-24">
        <div className="text-center mb-12">
          <h1 className="text-display tracking-display text-black mb-6">
            Explorador de
            <br />
            Jurisprudencia
          </h1>
          <p className="text-body-lg text-slate-gray max-w-2xl mx-auto">
            Busca sentencias de la Corte Constitucional de Colombia por tema,
            magistrado o n&uacute;mero de sentencia.
          </p>
        </div>
        <SearchResults trending={trending} />
      </section>
    </div>
  );
}
