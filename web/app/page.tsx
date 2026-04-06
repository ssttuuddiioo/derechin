import SearchResults from "@/components/SearchResults";

export const dynamic = "force-dynamic";

export default function Home() {
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
        <SearchResults />
      </section>
    </div>
  );
}
