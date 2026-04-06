import { notFound } from "next/navigation";
import Link from "next/link";
import { getSentenciaBySlug, getAllSentencias, getRelatedSentencias } from "@/lib/data";
import FichaJurisprudencial from "@/components/FichaJurisprudencial";
import RelatedCases from "@/components/RelatedCases";
import FullTextViewer from "@/components/FullTextViewer";

export const dynamic = "force-dynamic";

async function RelatedCasesSection({
  temas,
  currentId,
}: {
  temas: string[];
  currentId: string;
}) {
  const related = await getRelatedSentencias(temas, currentId);
  return <RelatedCases cases={related} />;
}

export async function generateMetadata({
  params,
}: {
  params: { id: string };
}) {
  const data = await getSentenciaBySlug(params.id);
  if (!data) return { title: "No encontrada" };
  return {
    title: `${data.metadata.sentencia_id} | Corte Constitucional Explorer`,
  };
}

export default async function SentenciaPage({
  params,
}: {
  params: { id: string };
}) {
  const data = await getSentenciaBySlug(params.id);
  if (!data) notFound();

  const { metadata: meta, summary, texto } = data;
  const allSentencias = await getAllSentencias();
  const allIds = new Set(allSentencias.map((s) => s.sentencia_id));

  return (
    <div className="max-w-4xl mx-auto px-6 pt-16 pb-24">
      <Link
        href="/"
        className="inline-flex items-center gap-1.5 text-sm text-slate-gray hover:text-link-cobalt transition-colors mb-8"
      >
        <svg
          className="w-4 h-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 19l-7-7 7-7"
          />
        </svg>
        Volver al explorador
      </Link>

      {summary ? (
        <FichaJurisprudencial
          metadata={meta}
          summary={summary}
          knownIds={allIds}
        />
      ) : (
        <div className="mb-16">
          <div className="bg-white rounded-2xl border border-border-lavender p-10 text-center">
            <p className="text-silver text-body-lg">
              No hay ficha jurisprudencial disponible para esta sentencia
            </p>
          </div>
        </div>
      )}

      {/* Related cases */}
      {summary && summary.temas.length > 0 && (
        <RelatedCasesSection
          temas={summary.temas}
          currentId={meta.sentencia_id}
        />
      )}

      {/* Full text */}
      <div className="mt-12">
        {texto ? (
          <section>
            <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-gray mb-4">
              Texto Completo
            </h2>
            <FullTextViewer texto={texto} />
          </section>
        ) : (
          <section>
            <div className="bg-white rounded-2xl border border-border-lavender p-10 text-center">
              <p className="text-silver text-body-lg">
                Texto completo no disponible
              </p>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
