import Link from "next/link";
import { sentenciaIdToSlug } from "@/lib/utils";
import { TIPO_CONFIG } from "@/lib/constants";

interface RelatedCase {
  sentencia_id: string;
  tipo: string;
  fecha: string;
  magistrado_ponente: string;
  temas: string[];
  shared_temas: string[];
}

export default function RelatedCases({ cases }: { cases: RelatedCase[] }) {
  if (!cases || cases.length === 0) return null;

  return (
    <section className="mt-12">
      <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-gray mb-6">
        Sentencias Relacionadas
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {cases.map((c) => {
          const config =
            TIPO_CONFIG[c.tipo as keyof typeof TIPO_CONFIG] || TIPO_CONFIG.T;
          const slug = sentenciaIdToSlug(c.sentencia_id);
          const year = c.fecha ? new Date(c.fecha).getFullYear() : "";

          return (
            <Link
              key={c.sentencia_id}
              href={`/sentencia/${slug}`}
              className="bg-white rounded-lg border border-border-lavender p-4 hover:shadow-whisper transition-shadow"
            >
              <div className="flex items-center gap-2 mb-2">
                <span
                  className="rounded-pill px-2 py-0.5 text-xs font-medium"
                  style={{ backgroundColor: config.bg, color: config.text }}
                >
                  {c.sentencia_id}
                </span>
                {year && (
                  <span className="text-xs text-silver">{year}</span>
                )}
              </div>

              {c.magistrado_ponente && (
                <p className="text-xs text-slate-gray mb-2">
                  MP: {c.magistrado_ponente}
                </p>
              )}

              <div className="flex flex-wrap gap-1">
                {c.shared_temas.slice(0, 3).map((tema) => (
                  <span
                    key={tema}
                    className="rounded-pill px-2 py-0.5 text-[10px] font-medium bg-link-cobalt/10 text-link-cobalt"
                  >
                    {tema.length > 40 ? tema.slice(0, 40) + "..." : tema}
                  </span>
                ))}
                {c.shared_temas.length > 3 && (
                  <span className="rounded-pill px-2 py-0.5 text-[10px] font-medium bg-cloud-gray text-silver">
                    +{c.shared_temas.length - 3}
                  </span>
                )}
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
