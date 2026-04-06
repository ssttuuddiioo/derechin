import { getSupabase } from "@/lib/supabase";
import LineasExplorer from "@/components/LineasExplorer";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "L\u00edneas Jurisprudenciales | Corte Constitucional Explorer",
};

interface TemaGroup {
  root: string;
  total: number;
  subtemas: Array<{ tema: string; count: number }>;
}

export default async function LineaIndexPage() {
  const { data: resumenes } = await getSupabase()
    .from("sentencia_resumenes")
    .select("temas")
    .not("temas", "is", null);

  // Count and group by root topic
  const counts: Record<string, number> = {};
  (resumenes || []).forEach((r) => {
    (r.temas || []).forEach((t: string) => {
      counts[t] = (counts[t] || 0) + 1;
    });
  });

  const groupMap: Record<
    string,
    { total: number; subtemas: Array<{ tema: string; count: number }> }
  > = {};

  Object.entries(counts).forEach(([tema, count]) => {
    const root = tema.split("-")[0].trim();
    if (!groupMap[root]) groupMap[root] = { total: 0, subtemas: [] };
    groupMap[root].total += count;
    groupMap[root].subtemas.push({ tema, count });
  });

  // Sort subtemas within each group
  Object.values(groupMap).forEach((g) => {
    g.subtemas.sort((a, b) => b.count - a.count);
  });

  const groups: TemaGroup[] = Object.entries(groupMap)
    .map(([root, data]) => ({ root, ...data }))
    .sort((a, b) => b.total - a.total);

  // Top categories for bento boxes
  const featured = groups.slice(0, 12);
  const allGroups = groups;

  return (
    <div className="max-w-6xl mx-auto px-6">
      <section className="pt-24 pb-8">
        <div className="text-center mb-12">
          <h1 className="text-section tracking-section text-black mb-4">
            L&iacute;neas Jurisprudenciales
          </h1>
          <p className="text-body-lg text-slate-gray max-w-xl mx-auto">
            Explora c&oacute;mo la Corte ha desarrollado cada tema
            constitucional a trav&eacute;s de sus sentencias.
          </p>
        </div>
      </section>

      <section className="pb-24">
        <LineasExplorer featured={featured} allGroups={allGroups} />
      </section>
    </div>
  );
}
