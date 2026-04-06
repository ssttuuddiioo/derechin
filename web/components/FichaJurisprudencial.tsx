import type { SentenciaMetadata, SentenciaSummary } from "@/lib/types";
import { TIPO_CONFIG } from "@/lib/constants";
import { formatFecha } from "@/lib/utils";
import TagList from "./TagList";
import PrecedentLinks from "./PrecedentLinks";

function Section({
  icon,
  label,
  children,
  accent,
}: {
  icon: string;
  label: string;
  children: React.ReactNode;
  accent?: string;
}) {
  return (
    <div className="py-5 first:pt-0 last:pb-0">
      <div className="flex items-center gap-2 mb-2.5">
        <span
          className="w-6 h-6 rounded-md flex items-center justify-center text-xs font-bold text-white"
          style={{ backgroundColor: accent || "#1c2024" }}
        >
          {icon}
        </span>
        <h3 className="text-xs font-semibold uppercase tracking-widest text-slate-gray">
          {label}
        </h3>
      </div>
      <div className="pl-8">{children}</div>
    </div>
  );
}

export default function FichaJurisprudencial({
  metadata,
  summary,
  knownIds,
}: {
  metadata?: SentenciaMetadata | null;
  summary: SentenciaSummary;
  knownIds?: Set<string>;
}) {
  const tipo = metadata?.tipo || "T";
  const config = TIPO_CONFIG[tipo as keyof typeof TIPO_CONFIG] || TIPO_CONFIG.T;

  return (
    <div className="space-y-8">
      {/* Header card */}
      {metadata && (
        <div
          className="rounded-2xl p-6 text-white"
          style={{ backgroundColor: config.bg }}
        >
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs uppercase tracking-widest opacity-80 mb-1">
                Ficha Jurisprudencial
              </p>
              <h2 className="text-2xl font-bold">{metadata.sentencia_id}</h2>
            </div>
            <span className="text-xs font-medium opacity-80 bg-white/20 rounded-pill px-3 py-1">
              {config.label}
            </span>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3 text-sm opacity-90">
            <div>
              <p className="text-xs uppercase tracking-wider opacity-60">
                Magistrado/a Ponente
              </p>
              <p className="font-medium">{metadata.magistrado_ponente}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wider opacity-60">
                Fecha
              </p>
              <p className="font-medium">{formatFecha(metadata.fecha)}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wider opacity-60">
                Sala
              </p>
              <p className="font-medium">{metadata.sala}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wider opacity-60">
                Proceso
              </p>
              <p className="font-medium">{metadata.proceso}</p>
            </div>
          </div>
        </div>
      )}

      {/* Relevancia — highlighted */}
      {summary.relevancia && (
        <div className="bg-black rounded-2xl p-6">
          <p className="text-xs uppercase tracking-widest text-silver mb-3">
            Por qu&eacute; importa esta sentencia
          </p>
          <p className="text-white text-body-lg leading-relaxed">
            {summary.relevancia}
          </p>
        </div>
      )}

      {/* Main content card */}
      <div className="bg-white rounded-2xl border border-border-lavender divide-y divide-border-lavender">
        <div className="p-6">
          {summary.norma_demandada && (
            <Section icon="N" label="Norma Demandada" accent="#363a3f">
              <p className="text-sm text-near-black font-medium">
                {summary.norma_demandada}
              </p>
            </Section>
          )}

          <Section icon="?" label="Problema Jur&iacute;dico" accent={config.bg}>
            <p className="text-base text-near-black leading-relaxed italic">
              {summary.problema_juridico}
            </p>
          </Section>
        </div>

        <div className="p-6">
          <Section icon="H" label="S&iacute;ntesis de los Hechos">
            <p className="text-base text-near-black leading-relaxed">
              {summary.hechos}
            </p>
          </Section>
        </div>

        <div className="p-6">
          <Section icon="R" label="Ratio Decidendi" accent={config.bg}>
            <p className="text-base text-near-black leading-relaxed">
              {summary.ratio_decidendi}
            </p>
          </Section>
        </div>

        <div className="p-6">
          <Section icon="&rarr;" label="Regla de Decisi&oacute;n">
            <div className="bg-cloud-gray rounded-xl p-4">
              <p className="text-base text-near-black leading-relaxed font-medium">
                {summary.regla_decision}
              </p>
            </div>
          </Section>
        </div>

        <div className="p-6">
          <Section icon="&check;" label="Decisi&oacute;n" accent="#10b981">
            <p className="text-base text-near-black leading-relaxed">
              {summary.decision}
            </p>
          </Section>
        </div>

        {summary.obiter_dicta && (
          <div className="p-6">
            <Section icon="+" label="Obiter Dicta" accent="#60646c">
              <p className="text-base text-slate-gray leading-relaxed">
                {summary.obiter_dicta}
              </p>
            </Section>
          </div>
        )}

        {summary.salvamentos_resumen && (
          <div className="p-6">
            <Section icon="SV" label="Salvamentos y Aclaraciones" accent="#ab6400">
              <p className="text-base text-near-black leading-relaxed">
                {summary.salvamentos_resumen}
              </p>
            </Section>
          </div>
        )}
      </div>

      {/* Cambio de precedente */}
      {summary.cambio_precedente && summary.nota_cambio && (
        <div className="rounded-2xl border-2 border-warning-amber bg-warning-amber/5 p-6">
          <div className="flex items-center gap-2 mb-2">
            <span className="w-6 h-6 rounded-md flex items-center justify-center text-xs font-bold text-white bg-warning-amber">
              !
            </span>
            <h3 className="text-sm font-semibold text-warning-amber">
              Cambio de Precedente
            </h3>
          </div>
          <p className="text-base text-near-black leading-relaxed pl-8">
            {summary.nota_cambio}
          </p>
        </div>
      )}

      {/* Tags + Precedent */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {summary.temas.length > 0 && (
          <div className="bg-white rounded-2xl border border-border-lavender p-5">
            <p className="text-xs font-semibold uppercase tracking-widest text-slate-gray mb-3">
              Temas
            </p>
            <TagList tags={summary.temas} />
          </div>
        )}
        {summary.derechos.length > 0 && (
          <div className="bg-white rounded-2xl border border-border-lavender p-5">
            <p className="text-xs font-semibold uppercase tracking-widest text-slate-gray mb-3">
              Derechos Fundamentales
            </p>
            <TagList tags={summary.derechos} variant="accent" />
          </div>
        )}
      </div>

      {/* Precedent */}
      {summary.precedente_citado.length > 0 && (
        <div className="bg-white rounded-2xl border border-border-lavender p-5">
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-gray mb-3">
            Nicho Citacional
          </p>
          <PrecedentLinks
            cited={summary.precedente_citado}
            knownIds={knownIds || new Set()}
          />
        </div>
      )}

      {/* Preguntas orientadoras */}
      {summary.preguntas_orientadoras &&
        summary.preguntas_orientadoras.length > 0 && (
          <div className="bg-cloud-gray rounded-2xl p-6">
            <p className="text-xs font-semibold uppercase tracking-widest text-slate-gray mb-4">
              Preguntas Orientadoras
            </p>
            <ol className="space-y-3">
              {summary.preguntas_orientadoras.map((q, i) => (
                <li key={i} className="flex gap-3">
                  <span
                    className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white"
                    style={{ backgroundColor: config.bg }}
                  >
                    {i + 1}
                  </span>
                  <p className="text-base text-near-black leading-relaxed">
                    {q}
                  </p>
                </li>
              ))}
            </ol>
          </div>
        )}
    </div>
  );
}
