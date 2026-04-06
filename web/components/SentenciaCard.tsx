import Link from "next/link";
import type { SentenciaMetadata, SentenciaSummary } from "@/lib/types";
import { sentenciaIdToSlug, formatFecha } from "@/lib/utils";
import TipoBadge from "./TipoBadge";
import TagList from "./TagList";

export default function SentenciaCard({
  sentencia,
  summary,
}: {
  sentencia: SentenciaMetadata;
  summary?: SentenciaSummary | null;
}) {
  const slug = sentenciaIdToSlug(sentencia.sentencia_id);

  return (
    <Link
      href={`/sentencia/${slug}`}
      className="block bg-white rounded-lg border border-border-lavender p-6 hover:shadow-whisper transition-shadow"
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <h3 className="text-subheading tracking-subheading text-black">
          {sentencia.sentencia_id}
        </h3>
        <TipoBadge tipo={sentencia.tipo} />
      </div>

      <p className="text-sm text-slate-gray mb-1">
        {formatFecha(sentencia.fecha)}
      </p>
      <p className="text-sm text-slate-gray mb-4">
        MP: {sentencia.magistrado_ponente}
      </p>

      {summary && summary.temas.length > 0 && (
        <TagList tags={summary.temas.slice(0, 3)} />
      )}
    </Link>
  );
}
