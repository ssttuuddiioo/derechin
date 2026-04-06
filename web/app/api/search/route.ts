import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q")?.trim();
  if (!q || q.length < 2) {
    return NextResponse.json({ results: [] });
  }

  const sb = getSupabase();

  try {
    // Run all searches in parallel
    const [idRes, decisionRes, hechosRes] = await Promise.all([
      // 1. Sentencia ID or magistrado match
      sb
        .from("sentencias")
        .select("sentencia_id, tipo, fecha, magistrado_ponente")
        .or(`sentencia_id.ilike.%${q}%,magistrado_ponente.ilike.%${q}%`)
        .order("fecha", { ascending: false })
        .limit(10),
      // 2. Decision text search
      sb
        .from("sentencia_resumenes")
        .select("sentencia_id, temas, hechos, decision")
        .ilike("decision", `%${q}%`)
        .limit(15),
      // 3. Hechos text search
      sb
        .from("sentencia_resumenes")
        .select("sentencia_id, temas, hechos, decision")
        .ilike("hechos", `%${q}%`)
        .limit(15),
    ]);

    // 4. Try tema search via RPC (array_to_string ILIKE) or fallback to contains
    let temaResults: typeof decisionRes.data = [];
    try {
      const { data } = await sb.rpc("search_by_tema", {
        query_text: q,
        max_results: 15,
      });
      if (data && data.length > 0) temaResults = data;
    } catch {
      // RPC not available — fallback to exact contains
      const patterns = [
        q.toUpperCase(),
        q.charAt(0).toUpperCase() + q.slice(1).toLowerCase(),
        `DERECHO A LA ${q.toUpperCase()}`,
        `DERECHO AL ${q.toUpperCase()}`,
      ];
      for (const p of patterns) {
        const { data } = await sb
          .from("sentencia_resumenes")
          .select("sentencia_id, temas, hechos, decision")
          .contains("temas", [p])
          .limit(10);
        if (data && data.length > 0) {
          temaResults = data;
          break;
        }
      }
    }

    // Merge all results, deduplicate
    const seen = new Set<string>();
    const results: Array<{
      sentencia_id: string;
      tipo: string;
      fecha: string;
      magistrado_ponente: string;
      temas: string[];
      snippet: string;
    }> = [];

    // Metadata lookup from ID search
    const metaMap = new Map(
      (idRes.data || []).map((s) => [s.sentencia_id, s])
    );

    const add = (
      id: string,
      temas: string[],
      hechos: string | null,
      decision: string | null
    ) => {
      if (seen.has(id)) return;
      seen.add(id);
      const meta = metaMap.get(id);
      let snippet = "";
      if (hechos && hechos.length > 10 && hechos !== "Sin Información") {
        snippet = hechos.slice(0, 200);
      } else if (decision) {
        snippet = decision.slice(0, 200);
      }
      // Highlight matching temas
      const qLower = q.toLowerCase();
      const matchingTemas = (temas || []).filter((t) =>
        t.toLowerCase().includes(qLower)
      );
      const displayTemas =
        matchingTemas.length > 0
          ? matchingTemas.slice(0, 5)
          : (temas || []).slice(0, 3);

      results.push({
        sentencia_id: id,
        tipo: meta?.tipo || id.split("-")[0] || "T",
        fecha: meta?.fecha || "",
        magistrado_ponente: meta?.magistrado_ponente || "",
        temas: displayTemas,
        snippet,
      });
    };

    // Priority: tema matches > hechos matches > decision matches > ID matches
    for (const r of temaResults || []) add(r.sentencia_id, r.temas, r.hechos, r.decision);
    for (const r of hechosRes.data || []) add(r.sentencia_id, r.temas, r.hechos, r.decision);
    for (const r of decisionRes.data || []) add(r.sentencia_id, r.temas, r.hechos, r.decision);
    for (const r of idRes.data || []) add(r.sentencia_id, [], null, null);

    // Fetch missing metadata in bulk
    const needMeta = results.filter((r) => !r.fecha).map((r) => r.sentencia_id);
    if (needMeta.length > 0) {
      const { data } = await sb
        .from("sentencias")
        .select("sentencia_id, tipo, fecha, magistrado_ponente")
        .in("sentencia_id", needMeta.slice(0, 50));
      const extra = new Map((data || []).map((m) => [m.sentencia_id, m]));
      results.forEach((r) => {
        const m = extra.get(r.sentencia_id);
        if (m && !r.fecha) {
          r.tipo = m.tipo;
          r.fecha = m.fecha;
          r.magistrado_ponente = m.magistrado_ponente;
        }
      });
    }

    return NextResponse.json({ results: results.slice(0, 20) });
  } catch (err) {
    console.error("Search error:", err);
    return NextResponse.json({ error: "Error" }, { status: 500 });
  }
}
