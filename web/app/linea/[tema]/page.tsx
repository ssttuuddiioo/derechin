import { getSupabase } from "@/lib/supabase";
import Timeline from "@/components/Timeline";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: { tema: string };
}) {
  const tema = decodeURIComponent(params.tema);
  return {
    title: `${tema} | L\u00ednea Jurisprudencial`,
  };
}

export default async function LineaTemaPage({
  params,
}: {
  params: { tema: string };
}) {
  const tema = decodeURIComponent(params.tema);

  // Get all resumenes that contain this tema
  const { data: resumenes } = await getSupabase()
    .from("sentencia_resumenes")
    .select("sentencia_id, hechos, ratio_decidendi, decision, temas, derechos, cambio_precedente, nota_cambio")
    .contains("temas", [tema]);

  // Get metadata for those sentencias
  const ids = (resumenes || []).map((r) => r.sentencia_id);
  const { data: sentencias } = await getSupabase()
    .from("sentencias")
    .select("sentencia_id, tipo, fecha, magistrado_ponente, sala")
    .in("sentencia_id", ids.length > 0 ? ids : ["__none__"])
    .order("fecha", { ascending: true });

  // Merge data for timeline
  const timelineData = (sentencias || []).map((s) => {
    const resumen = (resumenes || []).find(
      (r) => r.sentencia_id === s.sentencia_id
    );
    return {
      sentencia_id: s.sentencia_id,
      tipo: s.tipo,
      fecha: s.fecha,
      magistrado_ponente: s.magistrado_ponente,
      ratio_decidendi: resumen?.ratio_decidendi || "",
      decision: resumen?.decision || "",
      cambio_precedente: resumen?.cambio_precedente || false,
      nota_cambio: resumen?.nota_cambio || "",
    };
  });

  return (
    <div className="max-w-5xl mx-auto px-6">
      <section className="pt-24 pb-16">
        <h1 className="text-section tracking-section text-black mb-4">
          {tema}
        </h1>
        <p className="text-body-lg text-slate-gray">
          L&iacute;nea jurisprudencial &mdash; {timelineData.length} sentencia
          {timelineData.length !== 1 ? "s" : ""}
        </p>
      </section>

      <section className="pb-24">
        {timelineData.length === 0 ? (
          <p className="text-center text-silver text-body-lg py-16">
            No hay sentencias con este tema
          </p>
        ) : (
          <Timeline data={timelineData} />
        )}
      </section>
    </div>
  );
}
