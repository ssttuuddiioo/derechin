import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q")?.trim();
  if (!q || q.length < 2) {
    return NextResponse.json({ results: [] });
  }

  const sb = getSupabase();

  try {
    // Split into words for multi-term matching
    const terms = q.split(/\s+/).filter((t) => t.length >= 2);
    const primaryTerm = terms[0];

    // Single fast query: search resumenes decision + hechos with ilike
    // This is the most content-rich search
    const { data: resData } = await sb
      .from("sentencia_resumenes")
      .select("sentencia_id, temas, hechos, decision")
      .or(
        `decision.ilike.%${primaryTerm}%,hechos.ilike.%${primaryTerm}%`
      )
      .limit(40);

    // Also try tema RPC if available
    let temaData: typeof resData = [];
    try {
      const { data } = await sb.rpc("search_by_tema", {
        query_text: primaryTerm,
        max_results: 20,
      });
      if (data) temaData = data;
    } catch {
      // RPC not available
    }

    // Also match sentencia_id directly (fast, indexed)
    const { data: idData } = await sb
      .from("sentencias")
      .select("sentencia_id, tipo, fecha, magistrado_ponente")
      .ilike("sentencia_id", `%${primaryTerm}%`)
      .limit(10);

    // Merge all, deduplicate, score by multi-term relevance
    const seen = new Set<string>();
    const termsLower = terms.map((t) => t.toLowerCase());

    interface Scored {
      sentencia_id: string;
      temas: string[];
      snippet: string;
      score: number;
    }

    const scored: Scored[] = [];

    const addEntry = (
      id: string,
      temas: string[],
      hechos: string | null,
      decision: string | null
    ) => {
      if (seen.has(id)) return;
      seen.add(id);

      let snippet = "";
      if (hechos && hechos.length > 10 && hechos !== "Sin Informaci\u00f3n") {
        snippet = hechos;
      } else if (decision) {
        snippet = decision;
      }

      // Score: how many search terms appear in temas + snippet
      const searchable = (
        (temas || []).join(" ") +
        " " +
        snippet
      ).toLowerCase();
      let score = 0;
      for (const term of termsLower) {
        if (searchable.includes(term)) score += 1;
      }

      // Prefer results with matching temas
      const matchingTemas = (temas || []).filter((t) =>
        termsLower.some((term) => t.toLowerCase().includes(term))
      );
      if (matchingTemas.length > 0) score += 2;

      scored.push({
        sentencia_id: id,
        temas: matchingTemas.length > 0
          ? matchingTemas.slice(0, 5)
          : (temas || []).slice(0, 3),
        snippet: snippet.slice(0, 200),
        score,
      });
    };

    // Tema results first (highest quality)
    for (const r of temaData || []) {
      addEntry(r.sentencia_id, r.temas, r.hechos, r.decision);
    }
    // Then text matches
    for (const r of resData || []) {
      addEntry(r.sentencia_id, r.temas, r.hechos, r.decision);
    }
    // Then ID matches
    for (const r of idData || []) {
      if (!seen.has(r.sentencia_id)) {
        seen.add(r.sentencia_id);
        scored.push({
          sentencia_id: r.sentencia_id,
          temas: [],
          snippet: "",
          score: 1,
        });
      }
    }

    // Sort by score descending
    scored.sort((a, b) => b.score - a.score);

    // Filter: if multiple terms, require at least 1 match
    const minScore = terms.length > 1 ? 1 : 0;
    const top = scored.filter((r) => r.score >= minScore).slice(0, 20);

    // Fetch metadata for all results in one call
    const ids = top.map((r) => r.sentencia_id);
    const { data: metaData } = ids.length > 0
      ? await sb
          .from("sentencias")
          .select("sentencia_id, tipo, fecha, magistrado_ponente, url_relatoria")
          .in("sentencia_id", ids)
      : { data: [] };

    const metaMap = new Map(
      (metaData || []).map((m) => [m.sentencia_id, m])
    );

    const results = top.map((r) => {
      const meta = metaMap.get(r.sentencia_id);
      return {
        sentencia_id: r.sentencia_id,
        tipo: meta?.tipo || r.sentencia_id.split("-")[0] || "T",
        fecha: meta?.fecha || "",
        magistrado_ponente: meta?.magistrado_ponente || "",
        url_relatoria: meta?.url_relatoria || "",
        temas: r.temas,
        snippet: r.snippet,
      };
    });

    return NextResponse.json({ results });
  } catch (err) {
    console.error("Search error:", err);
    return NextResponse.json({ error: "Error" }, { status: 500 });
  }
}
