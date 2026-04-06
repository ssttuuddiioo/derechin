import SummarizeForm from "@/components/SummarizeForm";

export const metadata = {
  title: "Resumir Sentencia | Corte Constitucional Explorer",
};

export default function ResumirPage() {
  return (
    <div className="max-w-6xl mx-auto px-6">
      <section className="pt-24 pb-16 text-center">
        <h1 className="text-section tracking-section text-black mb-4">
          Resumir Sentencia
        </h1>
        <p className="text-body-lg text-slate-gray max-w-xl mx-auto">
          Pega el enlace de una sentencia de la Relator&iacute;a o escribe su
          identificador para obtener un resumen estructurado con IA.
        </p>
      </section>

      <section className="pb-24">
        <SummarizeForm />
      </section>
    </div>
  );
}
